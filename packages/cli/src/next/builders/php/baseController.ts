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
	createClassTemplate,
	createIdentifier,
	createMethodTemplate,
	createPhpFileBuilder,
	escapeSingleQuotes,
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_INDENT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '@wpkernel/php-json-ast';

export function createPhpBaseControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.base',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			if (options.input.phase !== 'generate' || !options.input.ir) {
				await next?.();
				return;
			}

			const { ir } = options.input;
			const namespaceRoot = ir.php.namespace;
			const namespace = `${namespaceRoot}\\Rest`;
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Rest',
				'BaseController.php'
			);

			const builderHelper = createPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'base-controller',
				filePath,
				namespace,
				metadata: { kind: 'base-controller' },
				build: (builder) => {
					appendGeneratedFileDocblock(builder, [
						`Source: ${ir.meta.origin} → resources (namespace: ${ir.meta.sanitizedNamespace})`,
					]);

					const getNamespaceMethod = createMethodTemplate({
						signature: 'public function get_namespace(): string',
						indentLevel: 1,
						indentUnit: PHP_INDENT,
						body: (body) => {
							body.line(
								`return '${escapeSingleQuotes(
									ir.meta.sanitizedNamespace
								)}';`
							);
						},
						ast: {
							flags: PHP_METHOD_MODIFIER_PUBLIC,
							returnType: createIdentifier('string'),
						},
					});

					const classTemplate = createClassTemplate({
						name: 'BaseController',
						flags: PHP_CLASS_MODIFIER_ABSTRACT,
						methods: [getNamespaceMethod],
					});

					appendClassTemplate(builder, classTemplate);
				},
			});

			await builderHelper.apply(options);
			await next?.();
		},
	});
}
