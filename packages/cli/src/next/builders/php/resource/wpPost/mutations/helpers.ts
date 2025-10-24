import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNode,
	buildReturn,
	buildParam,
	buildScalarBool,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	PHP_METHOD_MODIFIER_PRIVATE,
	assembleMethodTemplate,
	PHP_INDENT,
	toSnakeCase,
	type PhpExpr,
	type PhpExprTernary,
	type PhpMethodBodyBuilder,
	type PhpMethodTemplate,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../../ir/types';
import { formatStatementPrintable } from '../../printer';
import {
	buildArrayDimFetch,
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildForeachStatement,
	buildReturnVoid,
	buildPropertyFetch,
	buildScalarCast,
} from '../../utils';
import type { ResolvedIdentity } from '../../../identity';

type WpPostStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-post' }
>;

type WpPostMetaDescriptor = NonNullable<WpPostStorage['meta']>[string];
type WpPostTaxonomyDescriptor = NonNullable<
	WpPostStorage['taxonomies']
>[string];

export interface MutationHelperOptions {
	readonly resource: IRResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
}

export function syncWpPostMeta(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;

	return assembleMethodTemplate({
		signature: `private function sync${options.pascalName}Meta( int $post_id, WP_REST_Request $request ): void`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			if (metaEntries.length === 0) {
				appendStatement(
					body,
					buildExpressionStatement(
						buildFuncCall(buildName(['unset']), [
							buildArg(buildVariable('post_id')),
							buildArg(buildVariable('request')),
						])
					)
				);
				appendStatement(body, buildReturnVoid());
				return;
			}

			for (const [key, descriptor] of metaEntries) {
				const variableName = `${toSnakeCase(key)}Meta`;

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildMethodCall(
								buildVariable('request'),
								buildIdentifier('get_param'),
								[buildArg(buildScalarString(key))]
							)
						)
					)
				);

				const branchStatements: PhpStmt[] = [
					...createMetaSanitizerStatements(variableName, descriptor),
				];

				if (descriptor?.single === false) {
					branchStatements.push(
						buildExpressionStatement(
							buildFuncCall(buildName(['delete_post_meta']), [
								buildArg(buildVariable('post_id')),
								buildArg(buildScalarString(key)),
							])
						)
					);

					branchStatements.push(
						buildForeachStatement({
							iterable: buildScalarCast(
								'array',
								buildVariable(variableName)
							),
							value: 'value',
							statements: [
								buildExpressionStatement(
									buildFuncCall(
										buildName(['add_post_meta']),
										[
											buildArg(buildVariable('post_id')),
											buildArg(buildScalarString(key)),
											buildArg(buildVariable('value')),
										]
									)
								),
							],
						})
					);
				} else {
					branchStatements.push(
						buildExpressionStatement(
							buildFuncCall(buildName(['update_post_meta']), [
								buildArg(buildVariable('post_id')),
								buildArg(buildScalarString(key)),
								buildArg(buildVariable(variableName)),
							])
						)
					);
				}

				appendStatement(
					body,
					buildIfStatement(
						buildBinaryOperation(
							'NotIdentical',
							buildNull(),
							buildVariable(variableName)
						),
						branchStatements
					)
				);
			}
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			returnType: buildIdentifier('void'),
		},
	});
}

export function syncWpPostTaxonomies(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;

	return assembleMethodTemplate({
		signature: `private function sync${options.pascalName}Taxonomies( int $post_id, WP_REST_Request $request )`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			if (taxonomyEntries.length === 0) {
				appendStatement(
					body,
					buildExpressionStatement(
						buildFuncCall(buildName(['unset']), [
							buildArg(buildVariable('post_id')),
							buildArg(buildVariable('request')),
						])
					)
				);
				appendStatement(body, buildReturn(buildScalarBool(true)));
				return;
			}

			appendStatement(
				body,
				buildExpressionStatement(
					buildAssign(buildVariable('result'), buildScalarBool(true))
				)
			);

			for (const [key, descriptor] of taxonomyEntries) {
				const variableName = `${toSnakeCase(key)}Terms`;

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildMethodCall(
								buildVariable('request'),
								buildIdentifier('get_param'),
								[buildArg(buildScalarString(key))]
							)
						)
					)
				);

				const branchStatements: PhpStmt[] = [
					buildIfStatement(
						buildBooleanNot(
							buildFuncCall(buildName(['is_array']), [
								buildArg(buildVariable(variableName)),
							])
						),
						[
							buildExpressionStatement(
								buildAssign(
									buildVariable(variableName),
									buildArrayLiteral([
										{
											value: buildVariable(variableName),
										},
									])
								)
							),
						]
					),
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildFuncCall(buildName(['array_filter']), [
								buildArg(
									buildFuncCall(buildName(['array_map']), [
										buildArg(buildScalarString('intval')),
										buildArg(
											buildScalarCast(
												'array',
												buildVariable(variableName)
											)
										),
									])
								),
							])
						)
					),
					buildExpressionStatement(
						buildAssign(
							buildVariable('result'),
							buildFuncCall(buildName(['wp_set_object_terms']), [
								buildArg(buildVariable('post_id')),
								buildArg(buildVariable(variableName)),
								buildArg(
									buildScalarString(descriptor.taxonomy)
								),
								buildArg(buildScalarBool(false)),
							])
						)
					),
					buildIfStatement(
						buildFuncCall(buildName(['is_wp_error']), [
							buildArg(buildVariable('result')),
						]),
						[buildReturn(buildVariable('result'))]
					),
				];

				appendStatement(
					body,
					buildIfStatement(
						buildBinaryOperation(
							'NotIdentical',
							buildNull(),
							buildVariable(variableName)
						),
						branchStatements
					)
				);
			}

			appendStatement(body, buildReturn(buildVariable('result')));
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
		},
	});
}

export function prepareWpPostResponse(
	options: MutationHelperOptions
): PhpMethodTemplate {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;
	const supports = new Set(storage.supports ?? []);

	return assembleMethodTemplate({
		signature: `private function prepare${options.pascalName}Response( WP_Post $post, WP_REST_Request $request ): array`,
		indentLevel: 1,
		indentUnit: PHP_INDENT,
		body: (body) => {
			const baseItems = [
				{
					key: 'id',
					value: buildScalarCast(
						'int',
						buildPropertyFetch('post', 'ID')
					),
				},
				{
					key: 'status',
					value: buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_status')
					),
				},
			];

			if (options.identity.param === 'slug') {
				baseItems.splice(1, 0, {
					key: 'slug',
					value: buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_name')
					),
				});
			}

			appendStatement(
				body,
				buildExpressionStatement(
					buildAssign(
						buildVariable('data'),
						buildArrayLiteral(baseItems)
					)
				)
			);

			if (supports.has('title')) {
				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch(
								'data',
								buildScalarString('title')
							),
							buildScalarCast(
								'string',
								buildPropertyFetch('post', 'post_title')
							)
						)
					)
				);
			}

			if (supports.has('editor')) {
				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch(
								'data',
								buildScalarString('content')
							),
							buildScalarCast(
								'string',
								buildPropertyFetch('post', 'post_content')
							)
						)
					)
				);
			}

			if (supports.has('excerpt')) {
				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch(
								'data',
								buildScalarString('excerpt')
							),
							buildScalarCast(
								'string',
								buildPropertyFetch('post', 'post_excerpt')
							)
						)
					)
				);
			}

			for (const [key, descriptor] of metaEntries) {
				const variableName = `${toSnakeCase(key)}Meta`;
				const fetchFlag = descriptor?.single === false ? false : true;

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildFuncCall(buildName(['get_post_meta']), [
								buildArg(buildPropertyFetch('post', 'ID')),
								buildArg(buildScalarString(key)),
								buildArg(buildScalarBool(fetchFlag)),
							])
						)
					)
				);

				for (const statement of createMetaSanitizerStatements(
					variableName,
					descriptor
				)) {
					appendStatement(body, statement);
				}

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch('data', buildScalarString(key)),
							buildVariable(variableName)
						)
					)
				);
			}

			for (const [key, descriptor] of taxonomyEntries) {
				const variableName = `${toSnakeCase(key)}Terms`;

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildFuncCall(buildName(['wp_get_object_terms']), [
								buildArg(buildPropertyFetch('post', 'ID')),
								buildArg(
									buildScalarString(descriptor.taxonomy)
								),
								buildArg(
									buildArrayLiteral([
										{
											key: 'fields',
											value: buildScalarString('ids'),
										},
									])
								),
							])
						)
					)
				);

				appendStatement(
					body,
					buildIfStatement(
						buildFuncCall(buildName(['is_wp_error']), [
							buildArg(buildVariable(variableName)),
						]),
						[
							buildExpressionStatement(
								buildAssign(
									buildVariable(variableName),
									buildArrayLiteral([])
								)
							),
						]
					)
				);

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildFuncCall(buildName(['array_map']), [
								buildArg(buildScalarString('intval')),
								buildArg(
									buildScalarCast(
										'array',
										buildVariable(variableName)
									)
								),
							])
						)
					)
				);

				appendStatement(
					body,
					buildExpressionStatement(
						buildAssign(
							buildArrayDimFetch('data', buildScalarString(key)),
							buildVariable(variableName)
						)
					)
				);
			}

			appendStatement(body, buildReturn(buildVariable('data')));
		},
		ast: {
			flags: PHP_METHOD_MODIFIER_PRIVATE,
			params: [
				buildParam(buildVariable('post'), {
					type: buildName(['WP_Post']),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			returnType: buildIdentifier('array'),
		},
	});
}

function ensureStorage(resource: IRResource): WpPostStorage {
	const storage = resource.storage;
	if (!storage || storage.mode !== 'wp-post') {
		throw new KernelError('DeveloperError', {
			message: 'Resource must use wp-post storage.',
			context: { name: resource.name },
		});
	}

	return storage;
}

function appendStatement<T extends PhpStmt>(
	body: PhpMethodBodyBuilder,
	statement: T
): void {
	body.statement(
		formatStatementPrintable(statement, {
			indentLevel: body.getIndentLevel(),
			indentUnit: body.getIndentUnit(),
		})
	);
}

function createMetaSanitizerStatements(
	variableName: string,
	descriptor: WpPostMetaDescriptor
): PhpStmt[] {
	if (descriptor?.single === false && descriptor.type !== 'array') {
		const ensureArray = buildIfStatement(
			buildBooleanNot(
				buildFuncCall(buildName(['is_array']), [
					buildArg(variableExpr(variableName)),
				])
			),
			[
				buildExpressionStatement(
					buildAssign(
						variableExpr(variableName),
						buildArrayLiteral([
							{ value: variableExpr(variableName) },
						])
					)
				),
			]
		);

		const normalize = buildExpressionStatement(
			buildAssign(
				variableExpr(variableName),
				buildFuncCall(buildName(['array_values']), [
					buildArg(
						buildScalarCast('array', variableExpr(variableName))
					),
				])
			)
		);

		const foreachStatements: PhpStmt[] = [
			...createMetaSanitizerValueAssignments('meta_value', descriptor),
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch(
						variableName,
						variableExpr('meta_index')
					),
					variableExpr('meta_value')
				)
			),
		];

		const foreachNode = buildForeachStatement({
			iterable: variableExpr(variableName),
			key: 'meta_index',
			value: 'meta_value',
			statements: foreachStatements,
		});

		return [ensureArray, normalize, foreachNode];
	}

	return createMetaSanitizerValueAssignments(variableName, descriptor);
}

function createMetaSanitizerValueAssignments(
	variableName: string,
	descriptor: WpPostMetaDescriptor
): PhpStmt[] {
	const statements: PhpStmt[] = [];

	switch (descriptor.type) {
		case 'integer': {
			const condition = buildFuncCall(buildName(['is_numeric']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				buildScalarCast('int', variableExpr(variableName)),
				buildScalarInt(0)
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		case 'number': {
			const condition = buildFuncCall(buildName(['is_numeric']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				buildScalarCast('float', variableExpr(variableName)),
				buildScalarFloat(0)
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		case 'boolean': {
			statements.push(
				buildExpressionStatement(
					buildAssign(
						variableExpr(variableName),
						buildFuncCall(buildName(['rest_sanitize_boolean']), [
							buildArg(variableExpr(variableName)),
						])
					)
				)
			);
			break;
		}
		case 'array': {
			statements.push(
				buildExpressionStatement(
					buildAssign(
						variableExpr(variableName),
						buildFuncCall(buildName(['array_values']), [
							buildArg(
								buildScalarCast(
									'array',
									variableExpr(variableName)
								)
							),
						])
					)
				)
			);
			break;
		}
		case 'object': {
			const condition = buildFuncCall(buildName(['is_array']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				variableExpr(variableName),
				buildArrayLiteral([])
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		default: {
			const condition = buildFuncCall(buildName(['is_string']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				variableExpr(variableName),
				buildScalarCast('string', variableExpr(variableName))
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
		}
	}

	return statements;
}

function buildTernary(
	condition: PhpExpr,
	ifExpr: PhpExpr | null,
	elseExpr: PhpExpr
): PhpExprTernary {
	return buildNode<PhpExprTernary>('Expr_Ternary', {
		cond: condition,
		if: ifExpr,
		else: elseExpr,
	});
}

function variableExpr(name: string): PhpExpr {
	return buildVariable(name);
}
