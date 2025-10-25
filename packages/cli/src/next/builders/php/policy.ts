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
	buildArg,
	buildClass,
	buildClassMethod,
	buildComment,
	buildDocComment,
	buildIdentifier,
	buildName,
	buildNode,
	buildParam,
	buildReturn,
	buildScalarString,
	buildStmtNop,
	buildVariable,
	createPhpFileBuilder,
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpAstBuilderAdapter,
	type PhpAttributes,
	type PhpExprNew,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';
import { renderPhpValue } from './resource/phpValue';
import type { IRPolicyDefinition, IRv1 } from '../../../ir/types';
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

	const policyMap = buildPolicyMap(ir.policyMap.definitions);
	const fallback = sanitizeJson(ir.policyMap.fallback);

	const methods: PhpStmtClassMethod[] = [
		buildPolicyMapMethod(policyMap),
		buildFallbackMethod(fallback),
		buildCallbackMethod(),
		buildEnforceMethod(),
	];

	const classNode = buildClass(buildIdentifier('Policy'), {
		flags: PHP_CLASS_MODIFIER_FINAL,
		stmts: methods,
	});

	builder.appendProgramStatement(classNode);
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
	const docblock = [
		'Create a permission callback reference.',
		'@todo Return a closure once enforcement is implemented.',
	];

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
			stmts: [buildReturn(renderPhpValue('Policy::enforce'))],
		},
		createDocAttributes(docblock)
	);
}

function buildEnforceMethod(): PhpStmtClassMethod {
	const docblock = [
		'Evaluate a policy against the current user.',
		'@todo Wire kernel policy enforcement.',
	];

	const todo = buildStmtNop({
		comments: [
			buildComment('// TODO: Implement policy enforcement logic.'),
		],
	});

	const errorExpr = buildNode<PhpExprNew>('Expr_New', {
		class: buildName(['WP_Error']),
		args: [
			buildArg(buildScalarString('wpk_policy_stub')),
			buildArg(
				buildScalarString('Policy enforcement is not yet implemented.')
			),
		],
	});

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
			stmts: [todo, buildReturn(errorExpr)],
		},
		createDocAttributes(docblock)
	);
}

function createDocAttributes(
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
