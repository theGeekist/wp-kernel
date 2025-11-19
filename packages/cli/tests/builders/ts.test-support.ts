import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type {
	ResourceConfig,
	ResourceDataViewsScreenConfig,
	ResourceDataViewsUIConfig,
} from '@wpkernel/core/resource';
import type {
	BuildIrOptions,
	IRHashProvenance,
	IRResource,
	IRv1,
} from '../../src/ir/publicTypes';
import type { WPKernelConfigV1 } from '../../src/config/types';
export { withWorkspace } from './builder-harness.test-support.js';
export {
	buildReporter,
	buildOutput,
	normalise,
	prefixRelative,
} from './builder-harness.test-support.js';

export type {
	BuilderHarnessContext,
	WorkspaceFactoryOptions,
} from './builder-harness.test-support.js';
import { loadDefaultLayout } from '../layout.test-support.js';
import {
	buildControllerClassName,
	buildPluginMetaFixture,
} from '../ir/meta.test-support.js';

const makeHash = (value: string): IRHashProvenance => ({
	algo: 'sha256',
	inputs: [],
	value,
});

export interface WPKernelConfigSourceOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: {
		readonly screen?: Partial<ResourceDataViewsScreenConfig>;
	} | null;
}

export function buildWPKernelConfigSource(
	options: WPKernelConfigSourceOptions = {}
): string {
	const {
		namespace = 'demo-namespace',
		resourceKey = 'job',
		resourceName = 'job',
		dataviews = {},
	} = options;

	const includeDataViews = dataviews !== null;
	const camelResourceKey = toCamelCase(resourceKey);
	const identifier = `${camelResourceKey}DataViewsConfig`;

	const screenBlock = includeDataViews
		? buildScreenBlock(dataviews?.screen ?? {})
		: undefined;

	const dataViewsDeclaration = includeDataViews
		? `const ${identifier}: ResourceDataViewConfig<unknown, unknown> = {
        fields: [
                { id: 'title', label: 'Title' },
                { id: 'status', label: 'Status' },
        ],
        defaultView: {
                type: 'table',
                fields: ['title', 'status'],
        },
        mapQuery: (viewState: Record<string, unknown>) => {
                const search = toTrimmedString(viewState.search);
                return search ? { q: search } : {};
        },
        search: true,
        searchLabel: 'Search jobs',
        perPageSizes: [10, 25, 50],
        defaultLayouts: {
                table: { columns: ['title', 'status'] },
        },
        views: [
                {
                        id: 'all',
                        label: 'All jobs',
                        view: { type: 'table', fields: ['title', 'status'] },
                        isDefault: true,
                },
                {
                        id: 'draft',
                        label: 'Draft jobs',
                        view: {
                                type: 'table',
                                fields: ['title', 'status'],
                                filters: { status: ['draft'] },
                        },
                        description: 'Jobs awaiting publication.',
                },
        ],
        preferencesKey: 'jobs/admin',
        screen: ${screenBlock ?? '{}'},
};

`
		: '';

	const dataviewsAssignment = includeDataViews
		? `                        ui: { admin: { dataviews: ${identifier} } },
`
		: '';

	return `import type { ResourceDataViewConfig } from '@wpkernel/ui/dataviews';

const toTrimmedString = (value: unknown): string | undefined => {
        if (typeof value !== 'string') {
                return undefined;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
};

${dataViewsDeclaration}export const wpkConfig = {
        version: 1,
        namespace: '${namespace}',
        schemas: {},
        resources: {
                ${resourceKey}: {
                        name: '${resourceName}',
                        schema: 'auto',
                        routes: {},
                        cacheKeys: {},
${dataviewsAssignment}                },
        },
};
`;
}

export interface DataViewsConfigOverrides
	extends Partial<Omit<ResourceDataViewsUIConfig, 'screen'>> {
	readonly screen?: Partial<ResourceDataViewsScreenConfig> | null;
}

export function buildDataViewsConfig(
	overrides: DataViewsConfigOverrides = {}
): ResourceDataViewsUIConfig {
	const { screen: screenOverrides, ...rest } = overrides;

	const baseScreen: ResourceDataViewsScreenConfig = {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
		menu: {
			slug: 'jobs-admin',
			title: 'Jobs',
			capability: 'manage_options',
			parent: 'admin.php',
			position: 25,
		},
	};

	const screenConfig =
		screenOverrides === null
			? undefined
			: {
					...baseScreen,
					...(screenOverrides ?? {}),
				};

	const base: ResourceDataViewsUIConfig = {
		fields: [
			{ id: 'title', label: 'Title' },
			{ id: 'status', label: 'Status' },
		],
		defaultView: { type: 'table', fields: ['title', 'status'] },
		mapQuery: (viewState: Record<string, unknown>) => {
			const search = (viewState as { search?: string }).search ?? '';
			return search.trim().length > 0 ? { q: search.trim() } : {};
		},
		search: true,
		searchLabel: 'Search jobs',
		perPageSizes: [10, 25, 50],
		defaultLayouts: {
			table: { columns: ['title', 'status'] },
		},
		views: [
			{
				id: 'all',
				label: 'All jobs',
				view: { type: 'table', fields: ['title', 'status'] },
				isDefault: true,
			},
			{
				id: 'draft',
				label: 'Draft jobs',
				view: {
					type: 'table',
					fields: ['title', 'status'],
					filters: { status: ['draft'] },
				},
				description: 'Jobs awaiting publication.',
			},
		],
		preferencesKey: 'jobs/admin',
		...(screenConfig ? { screen: screenConfig } : {}),
	} satisfies ResourceDataViewsUIConfig;

	return {
		...base,
		...rest,
		...(screenConfig ? { screen: screenConfig } : {}),
	} satisfies ResourceDataViewsUIConfig;
}

export interface BuilderArtifactOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: ResourceDataViewsUIConfig | null;
	readonly sourcePath: string;
}

export interface BuilderArtifacts {
	readonly config: WPKernelConfigV1;
	readonly ir: IRv1;
	readonly options: BuildIrOptions;
}

export function buildBuilderArtifacts(
	options: BuilderArtifactOptions
): BuilderArtifacts {
	const layout = loadDefaultLayout();
	const {
		namespace = 'demo-namespace',
		resourceKey = 'job',
		resourceName = resourceKey,
		dataviews = buildDataViewsConfig(),
		sourcePath,
	} = options;

	const resourceConfig: ResourceConfig = {
		name: resourceName,
		schema: 'auto',
		routes: {},
		cacheKeys: {},
		...(dataviews
			? {
					ui: { admin: { dataviews } },
				}
			: {}),
	} as ResourceConfig;

	const config: WPKernelConfigV1 = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			[resourceKey]: resourceConfig,
		},
	} as WPKernelConfigV1;

	const irResource: IRResource = {
		id: `${resourceKey}:resource`,
		name: resourceName,
		controllerClass: buildControllerClassName(namespace, resourceName),
		schemaKey: resourceKey,
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [resourceKey, 'list'], source: 'config' },
			get: { segments: [resourceKey, 'get'], source: 'config' },
		},
		hash: makeHash('demo-hash'),
		warnings: [],
	} as IRResource;

	const sanitizedNamespace = toPascalCase(namespace);
	const pluginMeta = buildPluginMetaFixture({ namespace });

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace,
			origin: 'typescript',
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sanitizedNamespace,
			plugin: pluginMeta,
			features: [],
			ids: {
				algorithm: 'sha256',
				resourcePrefix: 'res:',
				schemaPrefix: 'sch:',
				blockPrefix: 'blk:',
				capabilityPrefix: 'cap:',
			},
			redactions: [],
			limits: {
				maxConfigKB: 0,
				maxSchemaKB: 0,
				policy: 'truncate',
			},
		},
		config,
		schemas: [],
		resources: [irResource],
		capabilities: [],
		capabilityMap: {
			sourcePath: undefined,
			definitions: [],
			fallback: {
				capability: 'manage_options',
				appliesTo: 'resource',
			},
			missing: [],
			unused: [],
			warnings: [],
		},
		blocks: [],
		php: {
			namespace: sanitizedNamespace,
			autoload: 'inc/',
			outputDir: layout.resolve('php.generated'),
		},
		layout,
	} as IRv1;

	const buildOptions: BuildIrOptions = {
		config,
		namespace,
		origin: 'typescript',
		sourcePath,
	} as BuildIrOptions;

	return { config, ir, options: buildOptions } satisfies BuilderArtifacts;
}

function buildScreenBlock(
	overrides: Partial<ResourceDataViewsScreenConfig>
): string {
	const screen: ResourceDataViewsScreenConfig = {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
		...overrides,
	};

	const lines: string[] = [`component: '${screen.component}',`];
	if (screen.route) {
		lines.push(`route: '${screen.route}',`);
	}
	if (screen.resourceImport) {
		lines.push(`resourceImport: '${screen.resourceImport}',`);
	}
	if (screen.resourceSymbol) {
		lines.push(`resourceSymbol: '${screen.resourceSymbol}',`);
	}
	if (screen.wpkernelImport) {
		lines.push(`wpkernelImport: '${screen.wpkernelImport}',`);
	}
	if (screen.wpkernelSymbol) {
		lines.push(`wpkernelSymbol: '${screen.wpkernelSymbol}',`);
	}
	if (screen.menu) {
		const menuLines: string[] = [];
		for (const [key, value] of Object.entries(screen.menu)) {
			if (typeof value === 'string') {
				menuLines.push(`${key}: '${value}',`);
				continue;
			}

			menuLines.push(`${key}: ${JSON.stringify(value)},`);
		}

		lines.push(`menu: {
                ${menuLines.join('\n                ')}
        },`);
	}

	return `{
        ${lines.join('\n        ')}
}`;
}

function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
