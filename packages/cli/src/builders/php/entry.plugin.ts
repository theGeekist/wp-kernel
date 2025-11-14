import path from 'node:path';
import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	AUTO_GUARD_BEGIN,
	buildPluginLoaderProgram,
	buildProgramTargetPlanner,
	getPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import { toPascalCase } from './utils';
import { buildUiConfig } from './pluginLoader.ui';

/**
 * Creates a PHP builder helper for generating the main plugin loader file (`plugin.php`).
 *
 * This helper generates the primary entry point for the WordPress plugin,
 * which includes and initializes all other generated PHP components.
 * It also checks for an existing `plugin.php` to avoid overwriting user-owned files.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the plugin loader file.
 */
export function createPhpPluginLoaderHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.plugin-loader',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, reporter } = options;
			if (!canGeneratePluginLoader(input)) {
				await next?.();
				return;
			}

			const ir = input.ir;

			const resourceClassNames = ir.resources.map((resource) => {
				const pascal = toPascalCase(resource.name);
				return `${ir.php.namespace}\\Rest\\${pascal}Controller`;
			});

			const uiResources = ir.ui?.resources ?? [];
			const uiConfig = buildUiConfig(ir, uiResources);
			await context.workspace.write(
				path.posix.join('.wpk', 'debug-ui.json'),
				JSON.stringify(
					{
						namespace: ir.meta.namespace,
						sanitizedNamespace: ir.meta.sanitizedNamespace,
						uiResources,
						uiConfig: uiConfig ?? null,
					},
					null,
					2
				),
				{ ensureDir: true }
			);

			if (
				await pluginLoaderIsUserOwned({
					workspace: context.workspace,
					reporter,
				})
			) {
				await next?.();
				return;
			}

			const loaderConfig = (
				uiConfig
					? {
							origin: ir.meta.origin,
							namespace: ir.php.namespace,
							sanitizedNamespace: ir.meta.sanitizedNamespace,
							resourceClassNames,
							ui: uiConfig,
						}
					: {
							origin: ir.meta.origin,
							namespace: ir.php.namespace,
							sanitizedNamespace: ir.meta.sanitizedNamespace,
							resourceClassNames,
						}
			) satisfies Parameters<typeof buildPluginLoaderProgram>[0];

			const program = buildPluginLoaderProgram(loaderConfig);

			const pluginRootDir = '.';

			const planner = buildProgramTargetPlanner({
				workspace: context.workspace,
				outputDir: pluginRootDir,
				channel: getPhpBuilderChannel(context),
			});

			planner.queueFile({
				fileName: 'plugin.php',
				program,
				metadata: { kind: 'plugin-loader' },
				docblock: [],
				uses: [],
				statements: [],
			});

			reporter.debug(
				'createPhpPluginLoaderHelper: queued plugin loader.',
				{ outputDir: pluginRootDir }
			);

			await next?.();
		},
	});
}

type GeneratePhaseInput = BuilderApplyOptions['input'] & {
	phase: 'generate';
	ir: NonNullable<BuilderApplyOptions['input']['ir']>;
};

function canGeneratePluginLoader(
	input: BuilderApplyOptions['input']
): input is GeneratePhaseInput {
	return input.phase === 'generate' && Boolean(input.ir);
}

async function pluginLoaderIsUserOwned({
	workspace,
	reporter,
}: {
	workspace: BuilderApplyOptions['context']['workspace'];
	reporter: BuilderApplyOptions['reporter'];
}): Promise<boolean> {
	try {
		const existingPlugin = await workspace.readText('plugin.php');
		if (
			existingPlugin &&
			!new RegExp(AUTO_GUARD_BEGIN, 'u').test(existingPlugin)
		) {
			reporter.info(
				'createPhpPluginLoaderHelper: skipping generation because plugin.php exists and appears user-owned.'
			);
			return true;
		}
	} catch {
		// ignore - file does not exist or cannot be read
	}

	return false;
}
