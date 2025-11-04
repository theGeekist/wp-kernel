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
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';
import { toPascalCase } from './utils';

/**
 * Creates a PHP builder helper for generating the main plugin loader file (`plugin.php`).
 *
 * This helper generates the primary entry point for the WordPress plugin,
 * which includes and initializes all other generated PHP components.
 * It also checks for an existing `plugin.php` to avoid overwriting user-owned files.
 *
 * @category PHP Builder
 * @returns A `BuilderHelper` instance for generating the plugin loader file.
 */
export function createPhpPluginLoaderHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.plugin-loader',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;

			const resourceClassNames = ir.resources.map((resource) => {
				const pascal = toPascalCase(resource.name);
				return `${ir.php.namespace}\\Rest\\${pascal}Controller`;
			});

			// If a plugin.php exists and lacks the WPK guard, assume user-owned and skip generation.
			try {
				const existingPlugin =
					await context.workspace.readText('plugin.php');
				if (
					existingPlugin &&
					!new RegExp(AUTO_GUARD_BEGIN, 'u').test(existingPlugin)
				) {
					reporter.info(
						'createPhpPluginLoaderHelper: skipping generation because plugin.php exists and appears user-owned.'
					);
					await next?.();
					return;
				}
			} catch {
				// ignore - file does not exist or cannot be read
			}

			const program = buildPluginLoaderProgram({
				origin: ir.meta.origin,
				namespace: ir.php.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				resourceClassNames,
			});

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
