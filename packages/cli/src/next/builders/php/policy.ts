import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import {
	appendGeneratedFileDocblock,
	createWpPhpFileBuilder,
} from '@wpkernel/wp-json-ast';
import {
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation,
	buildClass,
	buildClassMethod,
	buildClosure,
	buildClosureUse,
	buildDocComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNew,
	buildNull,
	buildNullableType,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarInt,
	buildScalarString,
	buildStaticCall,
	buildTernary,
	buildVariable,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpAstBuilderAdapter,
	type PhpAttributes,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import { renderPhpValue } from './resource/phpValue';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRPolicyDefinition, IRv1 } from '../../ir/publicTypes';
import { sanitizeJson } from './utils';

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
			reportPolicyWarnings(options.reporter, ir.policyMap);
			const namespace = `${ir.php.namespace}\\Policy`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Policy',
				'Policy.php'
			);

			const helper = createWpPhpFileBuilder<
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

	const policyMap = buildPolicyMap(ir.policyMap.definitions);
	const fallback = sanitizeJson(ir.policyMap.fallback);

	const methods: PhpStmtClassMethod[] = [
		buildPolicyMapMethod(policyMap),
		buildFallbackMethod(fallback),
		buildCallbackMethod(),
		buildEnforceMethod(),
		buildGetDefinitionMethod(),
		buildGetBindingMethod(),
		buildCreateErrorMethod(),
	];

	const classNode = buildClass(buildIdentifier('Policy'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});

	builder.appendProgramStatement(classNode);
}

function reportPolicyWarnings(
	reporter: Reporter,
	policyMap: IRv1['policyMap']
): void {
	for (const warning of policyMap.warnings) {
		reporter.warn('Policy helper warning emitted.', {
			code: warning.code,
			message: warning.message,
			context: warning.context,
		});
	}

	if (policyMap.missing.length > 0) {
		reporter.warn('Policies falling back to default capability.', {
			policies: policyMap.missing,
			capability: policyMap.fallback.capability,
		});
	}
}

function buildPolicyMapMethod(
	policyMap: Record<string, unknown>
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('policy_map'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(renderPhpValue(policyMap))],
	});
}

function buildFallbackMethod(
	fallback: Record<string, unknown>
): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('fallback'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(renderPhpValue(fallback))],
	});
}

function buildCallbackMethod(): PhpStmtClassMethod {
	const docblock = ['Create a permission callback closure for a policy.'];

	const closure = buildClosure({
		static: true,
		params: [
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		uses: [buildClosureUse(buildVariable('policy_key'))],
		stmts: [
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('enforce'),
					[
						buildArg(buildVariable('policy_key')),
						buildArg(buildVariable('request')),
					]
				)
			),
		],
	});

	return buildClassMethod(
		buildIdentifier('callback'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			params: [
				buildParam(buildVariable('policy_key'), {
					type: buildIdentifier('string'),
				}),
			],
			returnType: buildIdentifier('callable'),
			stmts: [buildReturn(closure)],
		},
		buildDocAttributes(docblock)
	);
}

function buildEnforceMethod(): PhpStmtClassMethod {
	const docblock = [
		'Evaluate a policy against the current user.',
		'@return bool|WP_Error',
	];

	const definitionAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('definition'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_definition'),
				[buildArg(buildVariable('policy_key'))]
			)
		)
	);

	const fallbackAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('fallback'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('fallback'),
				[]
			)
		)
	);

	const capabilityAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('capability'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('capability')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('capability')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('capability')
				)
			)
		)
	);

	const scopeAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('scope'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('appliesTo')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('appliesTo')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('appliesTo')
				)
			)
		)
	);

	const allowedDefaultAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
			])
		)
	);

	const bindingAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('binding'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_binding'),
				[buildArg(buildVariable('definition'))]
			)
		)
	);

	const ensureBindingStatement = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('binding'),
			buildNull()
		),
		[
			buildExpressionStatement(
				buildAssign(buildVariable('binding'), buildScalarString('id'))
			),
		]
	);

	const objectIdAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('object_id'),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_param'),
				[buildArg(buildVariable('binding'))]
			)
		)
	);

	const missingObjectGuard = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('object_id'),
			buildNull()
		),
		[
			buildReturn(
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
				)
			),
		]
	);

	const allowedObjectAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('capability')),
				buildArg(buildVariable('object_id')),
			])
		)
	);

	const objectScopeBlock = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildScalarString('object'),
			buildVariable('scope')
		),
		[
			bindingAssign,
			ensureBindingStatement,
			objectIdAssign,
			missingObjectGuard,
			allowedObjectAssign,
		]
	);

	const allowedGuard = buildIfStatement(buildVariable('allowed'), [
		buildReturn(buildScalarBool(true)),
	]);

	const deniedReturn = buildReturn(
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
		])
	);

	const statements: PhpStmt[] = [
		definitionAssign,
		fallbackAssign,
		capabilityAssign,
		scopeAssign,
		allowedDefaultAssign,
		objectScopeBlock,
		allowedGuard,
		deniedReturn,
	];

	return buildClassMethod(
		buildIdentifier('enforce'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			params: [
				buildParam(buildVariable('policy_key'), {
					type: buildIdentifier('string'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			stmts: statements,
		},
		buildDocAttributes(docblock)
	);
}

function buildGetDefinitionMethod(): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_definition'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('policy_key'), {
				type: buildIdentifier('string'),
			}),
		],
		returnType: buildIdentifier('array'),
		stmts: [
			buildExpressionStatement(
				buildAssign(
					buildVariable('map'),
					buildStaticCall(
						buildName(['self']),
						buildIdentifier('policy_map'),
						[]
					)
				)
			),
			buildIfStatement(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('map'),
							buildVariable('policy_key')
						)
					),
				]),
				[
					buildReturn(
						buildArrayDimFetch(
							buildVariable('map'),
							buildVariable('policy_key')
						)
					),
				]
			),
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('fallback'),
					[]
				)
			),
		],
	});
}

function buildGetBindingMethod(): PhpStmtClassMethod {
	const statements: PhpStmt[] = [
		buildExpressionStatement(
			buildAssign(
				buildVariable('binding'),
				buildTernary(
					buildFuncCall(buildName(['isset']), [
						buildArg(
							buildArrayDimFetch(
								buildVariable('definition'),
								buildScalarString('binding')
							)
						),
					]),
					buildArrayDimFetch(
						buildVariable('definition'),
						buildScalarString('binding')
					),
					buildNull()
				)
			)
		),
		buildIfStatement(
			buildBinaryOperation(
				'BooleanAnd',
				buildFuncCall(buildName(['is_string']), [
					buildArg(buildVariable('binding')),
				]),
				buildBinaryOperation(
					'NotIdentical',
					buildVariable('binding'),
					buildScalarString('')
				)
			),
			[buildReturn(buildVariable('binding'))]
		),
		buildReturn(buildNull()),
	];

	return buildClassMethod(buildIdentifier('get_binding'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('definition'), {
				type: buildIdentifier('array'),
			}),
		],
		returnType: buildNullableType(buildIdentifier('string')),
		stmts: statements,
	});
}

function buildCreateErrorMethod(): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('create_error'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('code'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('message'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('context'), {
				type: buildIdentifier('array'),
				default: buildArray([]),
			}),
		],
		returnType: buildIdentifier('WP_Error'),
		stmts: [
			buildExpressionStatement(
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
				)
			),
			buildReturn(
				buildNew(buildName(['WP_Error']), [
					buildArg(buildVariable('code')),
					buildArg(buildVariable('message')),
					buildArg(buildVariable('payload')),
				])
			),
		],
	});
}

function buildDocAttributes(
	docblock: readonly string[]
): PhpAttributes | undefined {
	if (docblock.length === 0) {
		return undefined;
	}

	return { comments: [buildDocComment(docblock)] };
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
