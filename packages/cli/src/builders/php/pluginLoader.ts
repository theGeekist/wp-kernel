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
} from '@wpkernel/wp-json-ast';
import { getPhpBuilderChannel } from './channel';
import { toPascalCase } from './utils';
import { sanitizeNamespace } from '../../adapters/extensions';
import type {
	ResourceConfig,
	ResourceDataViewsMenuConfig,
} from '@wpkernel/core/resource';
import type { IRv1 } from '../../ir/publicTypes';

interface NormalizedMenuConfig {
	readonly slug?: string;
	readonly title?: string;
	readonly capability?: string;
	readonly parent?: string;
	readonly position?: number;
}

interface PluginLoaderUiResourceDescriptor {
	readonly resource: string;
	readonly preferencesKey: string;
	readonly menu?: NormalizedMenuConfig;
}

interface PluginLoaderUiConfig {
	readonly handle: string;
	readonly assetPath: string;
	readonly scriptPath: string;
	readonly localizationObject: string;
	readonly namespace: string;
	readonly resources: readonly PluginLoaderUiResourceDescriptor[];
}

const DEFAULT_UI_ASSET_PATH = path.posix.join('build', 'index.asset.json');
const DEFAULT_UI_SCRIPT_PATH = path.posix.join('build', 'index.js');
const UI_LOCALIZATION_OBJECT = 'wpKernelUISettings';

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
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const ir = input.ir;

			const resourceClassNames = ir.resources.map((resource) => {
				const pascal = toPascalCase(resource.name);
				return `${ir.php.namespace}\\Rest\\${pascal}Controller`;
			});

			const uiResources = buildUiResourceDescriptors(ir);
			const uiConfig = buildUiConfig(ir, uiResources);

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
				...(uiConfig ? { ui: uiConfig } : {}),
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

function buildUiConfig(
	ir: IRv1,
	resources: readonly PluginLoaderUiResourceDescriptor[]
): PluginLoaderUiConfig | null {
	if (resources.length === 0) {
		return null;
	}

	const namespaceCandidate =
		ir.meta.sanitizedNamespace ?? ir.meta.namespace ?? '';
	const slug = sanitizeNamespace(namespaceCandidate);
	if (!slug) {
		return null;
	}

	return {
		handle: `wp-${slug}-ui`,
		assetPath: DEFAULT_UI_ASSET_PATH,
		scriptPath: DEFAULT_UI_SCRIPT_PATH,
		localizationObject: UI_LOCALIZATION_OBJECT,
		namespace: ir.meta.namespace,
		resources,
	} satisfies PluginLoaderUiConfig;
}

function buildUiResourceDescriptors(
	ir: IRv1
): PluginLoaderUiResourceDescriptor[] {
	const descriptors: PluginLoaderUiResourceDescriptor[] = [];
	const lookup = buildResourceConfigLookup(ir);

	for (const resource of ir.resources) {
		const entry = lookup.get(resource.name);
		if (!entry) {
			continue;
		}

		const dataviews = entry.config.ui?.admin?.dataviews;
		if (!dataviews) {
			continue;
		}

		const preferencesKey =
			dataviews.preferencesKey ??
			`${ir.meta.namespace}/dataviews/${resource.name}`;
		const menu = normaliseMenuConfig(dataviews.screen?.menu);

		descriptors.push({
			resource: resource.name,
			preferencesKey,
			...(menu ? { menu } : {}),
		});
	}

	return descriptors;
}

function buildResourceConfigLookup(
	ir: IRv1
): Map<string, { config: ResourceConfig }> {
	const lookup = new Map<string, { config: ResourceConfig }>();

	for (const [resourceKey, candidate] of Object.entries(
		ir.config.resources ?? {}
	)) {
		if (!candidate) {
			continue;
		}

		const config = candidate as ResourceConfig;
		const identifiers = new Set<string>();

		if (typeof config.name === 'string' && config.name.length > 0) {
			identifiers.add(config.name);
		}

		if (typeof resourceKey === 'string' && resourceKey.length > 0) {
			identifiers.add(resourceKey);
		}

		for (const identifier of identifiers) {
			if (!lookup.has(identifier)) {
				lookup.set(identifier, { config });
			}
		}
	}

	return lookup;
}

function normaliseMenuConfig(
	menu?: ResourceDataViewsMenuConfig | null
): NormalizedMenuConfig | undefined {
	if (!menu) {
		return undefined;
	}

	type MutableNormalizedMenuConfig = {
		-readonly [Key in keyof NormalizedMenuConfig]: NormalizedMenuConfig[Key];
	};

	const normalized: Partial<MutableNormalizedMenuConfig> = {};

	type NormalizedMenuStringKey = Extract<
		keyof NormalizedMenuConfig,
		'slug' | 'title' | 'capability' | 'parent'
	>;

	const stringFields: Array<{
		readonly key: NormalizedMenuStringKey;
		readonly value: unknown;
	}> = [
		{ key: 'slug', value: menu.slug },
		{ key: 'title', value: menu.title },
		{ key: 'capability', value: menu.capability },
		{ key: 'parent', value: menu.parent },
	];

	for (const { key, value } of stringFields) {
		if (typeof value === 'string' && value.length > 0) {
			normalized[key] =
				value as NormalizedMenuConfig[NormalizedMenuStringKey];
		}
	}

	if (typeof menu.position === 'number' && Number.isFinite(menu.position)) {
		normalized.position = menu.position;
	}

	return Object.keys(normalized).length > 0
		? (normalized as NormalizedMenuConfig)
		: undefined;
}
