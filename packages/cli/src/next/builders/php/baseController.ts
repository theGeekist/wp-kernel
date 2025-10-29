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
	buildBaseControllerProgram,
	createWpPhpFileBuilder,
	moduleSegment,
	deriveModuleNamespace,
	type ModuleNamespaceConfig,
} from '@wpkernel/wp-json-ast';

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
			const namespaceConfig: ModuleNamespaceConfig = {
				pluginNamespace: ir.php.namespace,
				sanitizedPluginNamespace: ir.meta.sanitizedNamespace,
				segments: [
					moduleSegment('Generated', ''),
					moduleSegment('Rest', ''),
				],
			};
			const filePath = options.context.workspace.resolve(
				ir.php.outputDir,
				'Rest',
				'BaseController.php'
			);

			const program = buildBaseControllerProgram({
				origin: ir.meta.origin,
				namespace: namespaceConfig,
			});
			const derivedNamespace =
				program.namespace ??
				deriveModuleNamespace(namespaceConfig).namespace;

			const builderHelper = createWpPhpFileBuilder<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				key: 'base-controller',
				filePath,
				namespace: derivedNamespace,
				metadata: program.metadata,
				build: (builder) => {
					appendGeneratedFileDocblock(builder, program.docblock);

					for (const statement of program.statements) {
						builder.appendProgramStatement(statement);
					}
				},
			});

			await builderHelper.apply(options);
			await next?.();
		},
	});
}
