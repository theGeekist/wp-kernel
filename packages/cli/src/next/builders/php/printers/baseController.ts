import { createHelper } from '../../../helper';
import type {
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../../runtime/types';
import { createPhpFileBuilder } from '@wpkernel/php-json-ast/builders';
import {
	appendGeneratedFileDocblock,
	appendClassTemplate,
	escapeSingleQuotes,
} from '@wpkernel/php-json-ast';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
} from '@wpkernel/php-json-ast/templates';
import {
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '@wpkernel/php-json-ast/modifiers';
import { createIdentifier } from '@wpkernel/php-json-ast/nodes';

export function createPhpBaseControllerHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.base',
		kind: 'builder',
		async apply(options, next) {
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
