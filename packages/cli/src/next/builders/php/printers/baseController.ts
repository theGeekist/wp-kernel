import { createHelper } from '../../../helper';
import type { BuilderHelper } from '../../../runtime/types';
import { createPhpFileBuilder } from '../ast/programBuilder';
import { appendGeneratedFileDocblock } from '../ast/docblocks';
import { appendClassTemplate } from '../ast/append';
import {
	createClassTemplate,
	createMethodTemplate,
	PHP_INDENT,
} from '../ast/templates';
import {
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '../ast/modifiers';
import { escapeSingleQuotes } from '../ast/utils';
import { createIdentifier } from '../ast/nodes';

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

			const builderHelper = createPhpFileBuilder({
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
