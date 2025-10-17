import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	ResourceConfig,
	ResourceDataViewsScreenConfig,
	ResourceDataViewsUIConfig,
} from '@wpkernel/core/resource';
import type { KernelConfigV1 } from '../../../config/types';
import type { BuildIrOptions, IRResource, IRv1 } from '../../../ir/types';
import { createWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace/types';
import type { BuilderOutput } from '../../runtime/types';

export interface BuilderHarnessContext {
	readonly workspace: Workspace;
	readonly root: string;
}

export async function withWorkspace(
	run: (context: BuilderHarnessContext) => Promise<void>
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ts-builder-'));
	try {
		const workspace = createWorkspace(root);
		await run({ workspace, root });
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

export interface KernelConfigSourceOptions {
	readonly namespace?: string;
	readonly resourceKey?: string;
	readonly resourceName?: string;
	readonly dataviews?: {
		readonly screen?: Partial<ResourceDataViewsScreenConfig>;
	} | null;
}

export function createKernelConfigSource(
	options: KernelConfigSourceOptions = {}
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
		? createScreenBlock(dataviews?.screen ?? {})
		: undefined;

	const dataViewsDeclaration = includeDataViews
		? `const ${identifier}: ResourceDataViewConfig<unknown, unknown> = {
        fields: [],
        defaultView: { type: 'table', fields: [] },
        mapQuery: (viewState: Record<string, unknown>) => {
                const search = toTrimmedString(viewState.search);
                return search ? { q: search } : {};
        },
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

${dataViewsDeclaration}export const kernelConfig = {
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

export function createDataViewsConfig(
	overrides: DataViewsConfigOverrides = {}
): ResourceDataViewsUIConfig {
	const { screen: screenOverrides, ...rest } = overrides;

	const baseScreen: ResourceDataViewsScreenConfig = {
		component: 'JobsAdminScreen',
		route: '/admin/jobs',
	};

	const screenConfig =
		screenOverrides === null
			? undefined
			: {
					...baseScreen,
					...(screenOverrides ?? {}),
				};

	const base: ResourceDataViewsUIConfig = {
		fields: [],
		defaultView: { type: 'table', fields: [] },
		mapQuery: (viewState) => {
			const search = (viewState as { search?: string }).search ?? '';
			return search.trim().length > 0 ? { q: search.trim() } : {};
		},
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
	readonly config: KernelConfigV1;
	readonly ir: IRv1;
	readonly options: BuildIrOptions;
}

export function createBuilderArtifacts(
	options: BuilderArtifactOptions
): BuilderArtifacts {
	const {
		namespace = 'demo-namespace',
		resourceKey = 'job',
		resourceName = resourceKey,
		dataviews = createDataViewsConfig(),
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

	const config: KernelConfigV1 = {
		version: 1,
		namespace,
		schemas: {},
		resources: {
			[resourceKey]: resourceConfig,
		},
	} as KernelConfigV1;

	const irResource: IRResource = {
		name: resourceName,
		schemaKey: resourceKey,
		schemaProvenance: 'manual',
		routes: [],
		cacheKeys: {
			list: { segments: [resourceKey, 'list'], source: 'config' },
			get: { segments: [resourceKey, 'get'], source: 'config' },
		},
		hash: 'demo-hash',
		warnings: [],
	};

	const sanitizedNamespace = toPascalCase(namespace);

	const ir: IRv1 = {
		meta: {
			version: 1,
			namespace,
			origin: 'typescript',
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sanitizedNamespace,
		},
		config,
		schemas: [],
		resources: [irResource],
		policies: [],
		policyMap: {
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
			outputDir: '.generated/php',
		},
	};

	const buildOptions: BuildIrOptions = {
		config,
		namespace,
		origin: 'typescript',
		sourcePath,
	};

	return { config, ir, options: buildOptions };
}

export function createReporter(): Reporter {
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn(),
	} as unknown as Reporter;
	(reporter.child as unknown as jest.Mock).mockReturnValue(reporter);
	return reporter;
}

export function createOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	const queueWrite = jest.fn((action: BuilderOutput['actions'][number]) => {
		actions.push(action);
	});

	return { actions, queueWrite };
}

export function normalise(candidate: string): string {
	return candidate.split(path.sep).join('/');
}

export function prefixRelative(candidate: string): string {
	if (candidate.startsWith('.')) {
		return candidate;
	}
	return `./${candidate}`;
}

function createScreenBlock(
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
	if (screen.kernelImport) {
		lines.push(`kernelImport: '${screen.kernelImport}',`);
	}
	if (screen.kernelSymbol) {
		lines.push(`kernelSymbol: '${screen.kernelSymbol}',`);
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
