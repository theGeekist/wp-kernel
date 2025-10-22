import { createHelper } from '../../../helper';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import {
	createPhpFileBuilder,
	type PhpAstBuilderAdapter,
} from '@wpkernel/php-json-ast/builders';
import {
	appendGeneratedFileDocblock,
	appendClassTemplate,
	createPrintable,
	createPhpReturn,
	sanitizeJson,
} from '@wpkernel/php-json-ast';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
} from '@wpkernel/php-json-ast/templates';
import {
	createIdentifier,
	createReturn,
	createScalarString,
	createStmtNop,
	createComment,
	createNode,
	createName,
	createArg,
	type PhpExprNew,
} from '@wpkernel/php-json-ast/nodes';
import type { IRPolicyDefinition, IRv1 } from '../../../../ir/types';
import {
	PHP_CLASS_MODIFIER_FINAL,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
} from '@wpkernel/php-json-ast/modifiers';

export function createPhpPolicyHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.policy',
		kind: 'builder',
		async apply(options, next) {
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

	const methods = [
		createMethodTemplate({
			signature: 'public static function policy_map(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const printable = createPhpReturn(policyMap, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: createIdentifier('array'),
			},
		}),
		createMethodTemplate({
			signature: 'public static function fallback(): array',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			body: (body) => {
				const printable = createPhpReturn(fallback, 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: createIdentifier('array'),
			},
		}),
		createMethodTemplate({
			signature:
				'public static function callback( string $policy_key ): callable',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				'Create a permission callback reference.',
				'@todo Return a closure once enforcement is implemented.',
			],
			body: (body) => {
				const printable = createPhpReturn('Policy::enforce', 2);
				body.statement(printable);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: createIdentifier('callable'),
			},
		}),
		createMethodTemplate({
			signature:
				'public static function enforce( string $policy_key, WP_REST_Request $request )',
			indentLevel: 1,
			indentUnit: PHP_INDENT,
			docblock: [
				'Evaluate a policy against the current user.',
				'@todo Wire kernel policy enforcement.',
			],
			body: (body) => {
				const todo = createStmtNop({
					comments: [
						createComment(
							'// TODO: Implement policy enforcement logic.'
						),
					],
				});
				body.statement(
					createPrintable(todo, [
						`${PHP_INDENT.repeat(2)}// TODO: Implement policy enforcement logic.`,
					])
				);

				const errorExpr = createNode<PhpExprNew>('Expr_New', {
					class: createName(['WP_Error']),
					args: [
						createArg(createScalarString('wpk_policy_stub')),
						createArg(
							createScalarString(
								'Policy enforcement is not yet implemented.'
							)
						),
					],
				});
				body.statement(
					createPrintable(createReturn(errorExpr), [
						`${PHP_INDENT.repeat(2)}return new WP_Error( 'wpk_policy_stub', 'Policy enforcement is not yet implemented.' );`,
					])
				);
			},
			ast: {
				flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
				returnType: null,
			},
		}),
	];

	const classTemplate = createClassTemplate({
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
