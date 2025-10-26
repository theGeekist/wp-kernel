import { KernelError } from '@wpkernel/core/contracts';
import {
	buildArg,
	buildAssign,
	buildClassMethod,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildTernary as buildPhpTernary,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	PHP_METHOD_MODIFIER_PRIVATE,
	type PhpExpr,
	type PhpExprTernary,
	type PhpStmt,
	type PhpStmtClassMethod,
	type PhpParam,
	type PhpType,
} from '@wpkernel/php-json-ast';
import type { IRResource } from '../../../../../../ir/types';
import {
	buildArrayDimFetch,
	buildArrayLiteral,
	buildBinaryOperation,
	buildBooleanNot,
	buildForeachStatement,
	buildFunctionCallAssignmentStatement,
	buildReturnVoid,
	buildPropertyFetch,
	buildScalarCast,
} from '../../utils';
import { toSnakeCase } from '../../../utils';
import type { ResolvedIdentity } from '../../../identity';
import { buildReturnIfWpError, buildIsWpErrorGuard } from '../../errors';

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
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;

	const statements: PhpStmt[] = [];

	if (metaEntries.length === 0) {
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['unset']), [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable('request')),
				])
			)
		);
		statements.push(buildReturnVoid());

		return buildHelperMethod({
			name: `sync${options.pascalName}Meta`,
			statements,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			returnType: buildIdentifier('void'),
		});
	}

	for (const [key, descriptor] of metaEntries) {
		const variableName = `${toSnakeCase(key)}Meta`;

		statements.push(
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
			...buildMetaSanitizerStatements(variableName, descriptor),
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
							buildFuncCall(buildName(['add_post_meta']), [
								buildArg(buildVariable('post_id')),
								buildArg(buildScalarString(key)),
								buildArg(buildVariable('value')),
							])
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

		statements.push(
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

	return buildHelperMethod({
		name: `sync${options.pascalName}Meta`,
		statements,
		params: [
			buildParam(buildVariable('post_id'), {
				type: buildIdentifier('int'),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		returnType: buildIdentifier('void'),
	});
}

export function syncWpPostTaxonomies(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;

	const statements: PhpStmt[] = [];

	if (taxonomyEntries.length === 0) {
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['unset']), [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable('request')),
				])
			)
		);
		statements.push(buildReturn(buildScalarBool(true)));

		return buildHelperMethod({
			name: `sync${options.pascalName}Taxonomies`,
			statements,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
		});
	}

	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('result'), buildScalarBool(true))
		)
	);

	for (const [key, descriptor] of taxonomyEntries) {
		const variableName = `${toSnakeCase(key)}Terms`;

		statements.push(
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
			buildFunctionCallAssignmentStatement({
				variable: 'result',
				functionName: 'wp_set_object_terms',
				args: [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable(variableName)),
					buildArg(buildScalarString(descriptor.taxonomy)),
					buildArg(buildScalarBool(false)),
				],
			}),
			buildReturnIfWpError(buildVariable('result')),
		];

		statements.push(
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

	statements.push(buildReturn(buildVariable('result')));

	return buildHelperMethod({
		name: `sync${options.pascalName}Taxonomies`,
		statements,
		params: [
			buildParam(buildVariable('post_id'), {
				type: buildIdentifier('int'),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
	});
}

export function prepareWpPostResponse(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;
	const supports = new Set(storage.supports ?? []);

	const statements: PhpStmt[] = [];

	const baseItems = [
		{
			key: 'id',
			value: buildScalarCast('int', buildPropertyFetch('post', 'ID')),
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

	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('data'), buildArrayLiteral(baseItems))
		)
	);

	appendSupportAssignments(statements, supports);

	for (const [key, descriptor] of metaEntries) {
		const variableName = `${toSnakeCase(key)}Meta`;
		const fetchFlag = descriptor?.single === false ? false : true;

		statements.push(
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

		statements.push(
			...buildMetaSanitizerStatements(variableName, descriptor)
		);

		statements.push(
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

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['wp_get_object_terms']), [
						buildArg(buildPropertyFetch('post', 'ID')),
						buildArg(buildScalarString(descriptor.taxonomy)),
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

		statements.push(
			buildIsWpErrorGuard({
				expression: buildVariable(variableName),
				statements: [
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildArrayLiteral([])
						)
					),
				],
			})
		);

		statements.push(
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

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString(key)),
					buildVariable(variableName)
				)
			)
		);
	}

	statements.push(buildReturn(buildVariable('data')));

	return buildHelperMethod({
		name: `prepare${options.pascalName}Response`,
		statements,
		params: [
			buildParam(buildVariable('post'), {
				type: buildName(['WP_Post']),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		returnType: buildIdentifier('array'),
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

function appendSupportAssignments(
	statements: PhpStmt[],
	supports: ReadonlySet<string>
): void {
	if (supports.has('title')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('title')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_title')
					)
				)
			)
		);
	}

	if (supports.has('editor')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('content')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_content')
					)
				)
			)
		);
	}

	if (supports.has('excerpt')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('excerpt')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_excerpt')
					)
				)
			)
		);
	}
}

function buildMetaSanitizerStatements(
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
			...buildMetaSanitizerValueAssignments('meta_value', descriptor),
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

		const foreach = buildForeachStatement({
			iterable: buildScalarCast('array', variableExpr(variableName)),
			value: 'meta_value',
			key: 'meta_index',
			statements: foreachStatements,
		});

		return [ensureArray, normalize, foreach];
	}

	return buildMetaSanitizerValueAssignments(variableName, descriptor);
}

function buildMetaSanitizerValueAssignments(
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
	return buildPhpTernary(condition, ifExpr, elseExpr);
}

function variableExpr(name: string): PhpExpr {
	return buildVariable(name);
}

function buildHelperMethod(options: {
	readonly name: string;
	readonly statements: PhpStmt[];
	readonly params: PhpParam[];
	readonly returnType?: PhpType | null;
}): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier(options.name), {
		flags: PHP_METHOD_MODIFIER_PRIVATE,
		params: options.params,
		returnType: options.returnType ?? null,
		stmts: options.statements,
	});
}
