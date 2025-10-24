import { createHelper } from '@wpkernel/core/pipeline';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendClassTemplate,
	appendGeneratedFileDocblock,
	assembleClassTemplate,
	assembleMethodTemplate,
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildMethodCall,
	buildIdentifier,
	buildName,
	buildNode,
	buildPhpReturnPrintable,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildNull,
	buildStaticCall,
	buildVariable,
	createPhpFileBuilder,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_INDENT,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	sanitizeJson,
	type PhpAstBuilderAdapter,
	type PhpExpr,
	type PhpExprNew,
	type PhpMethodBodyBuilder,
	type PhpPrintable,
	type PhpStmt,
	type PhpStmtElse,
	type PhpNullableType,
} from '@wpkernel/php-json-ast';
import { buildIfStatement } from '@wpkernel/php-json-ast';
import type { IRPolicyDefinition, IRv1 } from '../../../ir/types';
import { formatStatementPrintable } from './resource/printer';

export function createPhpPolicyHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.policy',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const { ir } = input;
			const namespace = `${ir.php.namespace}\\Policy`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Policy',
				'Policy.php'
			);

			const helper = createPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'policy-helper',
				filePath,
				namespace,
				metadata: { kind: 'policy-helper' },
				build: (builder) => buildPolicyHelper(builder, ir),
			});

			await helper.apply(options);
			await next?.();
		},
	});
}

function buildPolicyHelper(builder: PhpAstBuilderAdapter, ir: IRv1): void {
	const source = ir.policyMap.sourcePath ?? '[fallback]';
	appendGeneratedFileDocblock(builder, [
		`Source: ${ir.meta.origin} → policy-map (${source})`,
	]);

	builder.addUse('WP_Error');
	builder.addUse('WP_REST_Request');
	builder.addUse('function array_merge');
	builder.addUse('function array_key_exists');
	builder.addUse('function current_user_can');
	builder.addUse('function sprintf');
	builder.addUse('function is_string');

	const policyMap = buildPolicyMap(ir.policyMap.definitions);
	const fallback = sanitizeJson(ir.policyMap.fallback);

	const methods = [
		assembleMethodTemplate({
			signature: 'public static function policy_map(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const printable = buildPhpReturnPrintable(policyMap, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: buildIdentifier('array'),
			},
		}),
		assembleMethodTemplate({
			signature: 'public static function fallback(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const printable = buildPhpReturnPrintable(fallback, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: buildIdentifier('array'),
			},
		}),
		assembleMethodTemplate({
			signature:
				'public static function callback( string $policy_key ): callable',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: ['Create a permission callback reference.'],
			body: (body) => {
				const printable = buildPhpReturnPrintable('Policy::enforce', 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: buildIdentifier('callable'),
			},
		}),
		assembleMethodTemplate({
			signature:
				'public static function enforce( string $policy_key, WP_REST_Request $request )',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				'Evaluate a policy against the current user.',
				'@return bool|WP_Error',
			],
			body: buildEnforceMethodBody,
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: null,
			},
		}),
		assembleMethodTemplate({
			signature:
				'private static function get_definition( string $policy_key ): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: ['Retrieve the configuration for a policy key.'],
			body: buildGetDefinitionBody,
			ast: {
				flags: PHP_METHOD_MODIFIER_STATIC,
				returnType: buildIdentifier('array'),
			},
		}),
		assembleMethodTemplate({
			signature:
				'private static function get_binding( array $definition ): ?string',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				'Resolve the request parameter used for object policies.',
			],
			body: buildGetBindingBody,
			ast: {
				flags: PHP_METHOD_MODIFIER_STATIC,
				returnType: buildNode<PhpNullableType>('NullableType', {
					type: buildIdentifier('string'),
				}),
			},
		}),
		assembleMethodTemplate({
			signature:
				'private static function create_error( string $code, string $message, array $context = array() ): WP_Error',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				'Create a consistent WP_Error instance for policy failures.',
			],
			body: buildCreateErrorBody,
			ast: {
				flags: PHP_METHOD_MODIFIER_STATIC,
				returnType: buildName(['WP_Error']),
			},
		}),
	];

	const classTemplate = assembleClassTemplate({
		name: 'Policy',
		flags: PHP_CLASS_MODIFIER_FINAL,
		methods,
	});

	appendClassTemplate(builder, classTemplate);
}

function buildPolicyMap(
	definitions: readonly IRPolicyDefinition[]
): Record<string, unknown> {
	const entries: Record<string, unknown> = {};
	for (const definition of definitions) {
		entries[definition.key] = sanitizeJson({
			capability: definition.capability,
			appliesTo: definition.appliesTo,
			binding: definition.binding ?? null,
		});
	}

	return entries;
}

const METHOD_BODY_INDENT = 2;

function buildEnforceMethodBody(body: PhpMethodBodyBuilder): void {
	const indentLevel = METHOD_BODY_INDENT;

	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('definition'),
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('get_definition'),
					[buildArg(buildVariable('policy_key'))]
				)
			),
			indentLevel
		)
	);
	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('fallback'),
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('fallback'),
					[]
				)
			),
			indentLevel
		)
	);
	body.blank();

	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('capability'),
				buildCoalesce(
					buildArrayDimFetch(
						buildVariable('definition'),
						buildScalarString('capability')
					),
					buildArrayDimFetch(
						buildVariable('fallback'),
						buildScalarString('capability')
					)
				)
			),
			indentLevel
		)
	);
	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('scope'),
				buildCoalesce(
					buildArrayDimFetch(
						buildVariable('definition'),
						buildScalarString('appliesTo')
					),
					buildArrayDimFetch(
						buildVariable('fallback'),
						buildScalarString('appliesTo')
					)
				)
			),
			indentLevel
		)
	);
	body.blank();

	const bindingAssign = createExpressionStatementPrintable(
		buildAssign(
			buildVariable('binding'),
			buildCoalesce(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('get_binding'),
					[buildArg(buildVariable('definition'))]
				),
				buildScalarString('id')
			)
		),
		indentLevel + 1
	);
	const objectIdAssign = createExpressionStatementPrintable(
		buildAssign(
			buildVariable('object_id'),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_param'),
				[buildArg(buildVariable('binding'))]
			)
		),
		indentLevel + 1
	);
	const missingObjectGuard = createIfPrintable({
		indentLevel: indentLevel + 1,
		condition: buildIdentical(buildNull(), buildVariable('object_id')),
		statements: [
			createReturnPrintable(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('create_error'),
					[
						buildArg(
							buildScalarString('wpk_policy_object_missing')
						),
						buildArg(
							buildFuncCall(buildName(['sprintf']), [
								buildArg(
									buildScalarString(
										'Object identifier parameter "%s" missing for policy "%s".'
									)
								),
								buildArg(buildVariable('binding')),
								buildArg(buildVariable('policy_key')),
							])
						),
					]
				),
				indentLevel + 2
			),
		],
	});
	const allowedWithObject = createExpressionStatementPrintable(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
				buildArg(buildVariable('object_id')),
			])
		),
		indentLevel + 1
	);
	const allowedWithoutObject = createExpressionStatementPrintable(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
			])
		),
		indentLevel + 1
	);

	const objectGuard = createIfPrintable({
		indentLevel,
		condition: buildIdentical(
			buildScalarString('object'),
			buildVariable('scope')
		),
		statements: [
			bindingAssign,
			objectIdAssign,
			missingObjectGuard,
			allowedWithObject,
		],
		elseStatements: [allowedWithoutObject],
	});
	body.statement(objectGuard);
	body.blank();

	const allowedGuard = createIfPrintable({
		indentLevel,
		condition: buildVariable('allowed'),
		statements: [
			createReturnPrintable(buildScalarBool(true), indentLevel + 1),
		],
	});
	body.statement(allowedGuard);
	body.blank();

	const deniedReturn = createReturnPrintable(
		buildStaticCall(buildName(['self']), buildIdentifier('create_error'), [
			buildArg(buildScalarString('wpk_policy_denied')),
			buildArg(
				buildScalarString('You are not allowed to perform this action.')
			),
			buildArg(
				buildArray([
					buildArrayItem(buildVariable('policy_key'), {
						key: buildScalarString('policy'),
					}),
					buildArrayItem(buildVariable('capability'), {
						key: buildScalarString('capability'),
					}),
				])
			),
		]),
		indentLevel
	);
	body.statement(deniedReturn);
}

function buildGetDefinitionBody(body: PhpMethodBodyBuilder): void {
	const indentLevel = METHOD_BODY_INDENT;

	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('map'),
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('policy_map'),
					[]
				)
			),
			indentLevel
		)
	);

	const guard = createIfPrintable({
		indentLevel,
		condition: buildFuncCall(buildName(['array_key_exists']), [
			buildArg(buildVariable('policy_key')),
			buildArg(buildVariable('map')),
		]),
		statements: [
			createReturnPrintable(
				buildArrayDimFetch(
					buildVariable('map'),
					buildVariable('policy_key')
				),
				indentLevel + 1
			),
		],
	});
	body.statement(guard);
	body.blank();

	body.statement(
		createReturnPrintable(
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('fallback'),
				[]
			),
			indentLevel
		)
	);
}

function buildGetBindingBody(body: PhpMethodBodyBuilder): void {
	const indentLevel = METHOD_BODY_INDENT;

	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('binding'),
				buildCoalesce(
					buildArrayDimFetch(
						buildVariable('definition'),
						buildScalarString('binding')
					),
					buildNull()
				)
			),
			indentLevel
		)
	);

	const guard = createIfPrintable({
		indentLevel,
		condition: buildBooleanAnd(
			buildFuncCall(buildName(['is_string']), [
				buildArg(buildVariable('binding')),
			]),
			buildNotIdentical(buildVariable('binding'), buildScalarString(''))
		),
		statements: [
			createReturnPrintable(buildVariable('binding'), indentLevel + 1),
		],
	});
	body.statement(guard);
	body.blank();

	body.statement(createReturnPrintable(buildNull(), indentLevel));
}

function buildCreateErrorBody(body: PhpMethodBodyBuilder): void {
	const indentLevel = METHOD_BODY_INDENT;

	body.statement(
		createExpressionStatementPrintable(
			buildAssign(
				buildVariable('payload'),
				buildFuncCall(buildName(['array_merge']), [
					buildArg(
						buildArray([
							buildArrayItem(buildScalarInt(403), {
								key: buildScalarString('status'),
							}),
						])
					),
					buildArg(buildVariable('context')),
				])
			),
			indentLevel
		)
	);
	body.blank();

	const errorExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildVariable('code')),
			buildArg(buildVariable('message')),
			buildArg(buildVariable('payload')),
		],
	});

	body.statement(createReturnPrintable(errorExpr, indentLevel));
}

interface IfPrintableOptions {
	readonly indentLevel: number;
	readonly condition: PhpExpr;
	readonly statements: readonly PhpPrintable<PhpStmt>[];
	readonly elseStatements?: readonly PhpPrintable<PhpStmt>[];
}

function createIfPrintable(options: IfPrintableOptions): PhpPrintable<PhpStmt> {
	const elseBranch =
		options.elseStatements && options.elseStatements.length > 0
			? buildNode<PhpStmtElse>('Stmt_Else', {
					stmts: options.elseStatements.map(
						(statement) => statement.node
					),
				})
			: null;

	const node = buildIfStatement(
		options.condition,
		options.statements.map((statement) => statement.node),
		{
			elseifs: [],
			elseBranch,
		}
	);

	return formatStatementPrintable(node, {
		indentLevel: options.indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createExpressionStatementPrintable(
	expr: PhpExpr,
	indentLevel: number
): PhpPrintable<PhpStmt> {
	return formatStatementPrintable(buildExpressionStatement(expr), {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function createReturnPrintable(
	expr: PhpExpr,
	indentLevel: number
): PhpPrintable<PhpStmt> {
	return formatStatementPrintable(buildReturn(expr), {
		indentLevel,
		indentUnit: PHP_INDENT,
	});
}

function buildCoalesce(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildNode('Expr_BinaryOp_Coalesce', {
		left,
		right,
	});
}

function buildIdentical(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildNode('Expr_BinaryOp_Identical', {
		left,
		right,
	});
}

function buildNotIdentical(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildNode('Expr_BinaryOp_NotIdentical', {
		left,
		right,
	});
}

function buildBooleanAnd(left: PhpExpr, right: PhpExpr): PhpExpr {
	return buildNode('Expr_BinaryOp_BooleanAnd', {
		left,
		right,
	});
}
