import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	buildBaseControllerProgram,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	deriveModuleNamespace,
	moduleSegment,
	type ModuleNamespaceConfig,
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';
import { compileModuleProgram } from './moduleProgram';

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
			const program = buildBaseControllerProgram({
				origin: ir.meta.origin,
				namespace: namespaceConfig,
			});
			const derivedNamespace =
				program.namespace ??
				deriveModuleNamespace(namespaceConfig).namespace;
			const planner = buildProgramTargetPlanner({
				workspace: options.context.workspace,
				outputDir: ir.php.outputDir,
				channel: getPhpBuilderChannel(options.context),
				docblockPrefix: DEFAULT_DOC_HEADER,
			});

			const fileProgram = compileModuleProgram({
				namespace: derivedNamespace,
				docblock: program.docblock,
				metadata: program.metadata,
				statements: program.statements,
			});

			planner.queueFile({
				fileName: 'Rest/BaseController.php',
				program: fileProgram,
				metadata: program.metadata,
				docblock: program.docblock,
				uses: [],
				statements: [],
			});
			options.reporter.debug(
				'createPhpBaseControllerHelper: queued Rest/BaseController.php.'
			);
			await next?.();
		},
	});
}
