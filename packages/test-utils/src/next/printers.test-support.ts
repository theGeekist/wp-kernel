import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';
import type {
	IRBlock,
	IRPolicyMap,
	IRResource,
	IRRoute,
	IRSchema,
	IRv1,
} from '@wpkernel/cli/next/ir';
import type { ResourcePostMetaDescriptor } from '@wpkernel/core/resource';

export interface MakeWPKernelConfigFixtureOptions {
	readonly namespace?: string;
	readonly schemas?: WPKernelConfigV1['schemas'];
	readonly resources?: WPKernelConfigV1['resources'];
	readonly adapters?: WPKernelConfigV1['adapters'];
}

export function makeWPKernelConfigFixture(
	options: MakeWPKernelConfigFixtureOptions = {}
): WPKernelConfigV1 {
	const defaultSchemas: WPKernelConfigV1['schemas'] = {
		job: {
			path: './contracts/job.schema.json',
			generated: {
				types: './.generated/../types/job.d.ts',
			},
		},
	};
	const defaultResources: WPKernelConfigV1['resources'] = {};

	const {
		namespace = 'demo-namespace',
		schemas,
		resources,
		adapters,
	} = options;

	return {
		version: 1,
		namespace,
		schemas: schemas ?? defaultSchemas,
		resources: resources ?? defaultResources,
		...(adapters ? { adapters } : {}),
	} satisfies WPKernelConfigV1;
}

export interface MakePrinterIrFixtureOptions {
	readonly config?: WPKernelConfigV1;
	readonly schemas?: IRSchema[];
	readonly resources?: IRResource[];
	readonly policyMap?: IRPolicyMap;
	readonly policies?: IRv1['policies'];
	readonly blocks?: IRBlock[];
	readonly php?: IRv1['php'];
	readonly meta?: Partial<IRv1['meta']>;
	readonly diagnostics?: IRv1['diagnostics'];
}

/* eslint-disable complexity */
export function makePrinterIrFixture({
	config = makeWPKernelConfigFixture(),
	schemas = makeDefaultSchemas(),
	resources = makeDefaultResources(),
	policyMap = makeDefaultPolicyMap(),
	policies = [],
	blocks = [],
	php = {
		namespace: 'Demo\\Namespace',
		autoload: 'inc/',
		outputDir: '.generated/php',
	},
	meta: metaOverrides = {},
	diagnostics,
}: MakePrinterIrFixtureOptions = {}): IRv1 {
	const {
		namespace = 'demo-namespace',
		sourcePath = WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		origin = WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		sanitizedNamespace = 'Demo\\Namespace',
		...restMeta
	} = metaOverrides;

	const meta: IRv1['meta'] = {
		version: 1,
		namespace,
		sourcePath,
		origin,
		sanitizedNamespace,
		...restMeta,
	};

	return {
		meta,
		config,
		schemas,
		resources,
		policies,
		policyMap,
		blocks,
		php,
		...(diagnostics ? { diagnostics } : {}),
	} satisfies IRv1;
}
/* eslint-enable complexity */

export function makeDefaultSchemas(): IRSchema[] {
	const jobSchema: IRSchema = {
		key: 'job',
		sourcePath: 'contracts/job.schema.json',
		hash: 'hash-job',
		schema: {
			type: 'object',
			required: ['id', 'status'],
			properties: {
				id: {
					type: 'integer',
					description: 'Identifier',
					minimum: 0,
				},
				log_path: {
					type: 'string',
					description: 'Windows log path for debugging',
					examples: ['C:\\logs\\'],
				},
				title: { type: 'string', description: 'Title' },
				status: {
					type: 'string',
					enum: ['draft', 'published'],
				},
			},
		},
		provenance: 'manual',
	};

	const taskSchema: IRSchema = {
		key: 'auto:task',
		sourcePath: '[storage:task]',
		hash: 'hash-task',
		schema: {
			type: 'object',
			required: ['slug', 'status'],
			properties: {
				slug: { type: 'string' },
				status: { type: 'string' },
				tags: {
					type: 'array',
					items: { type: 'string', enum: [] },
				},
			},
		},
		provenance: 'auto',
		generatedFrom: { type: 'storage', resource: 'task' },
	};

	const literalSchema: IRSchema = {
		key: 'literal',
		sourcePath: 'schemas/literal.schema.json',
		hash: 'hash-literal',
		schema: {
			type: 'object',
			properties: {
				uuid: { type: 'string', format: 'uuid' },
				title: { type: 'string' },
			},
		},
		provenance: 'manual',
	};

	const fallbackSchema: IRSchema = {
		key: 'auto:',
		sourcePath: '[storage:fallback]',
		hash: 'hash-fallback',
		schema: {
			type: 'object',
			properties: {
				id: { type: 'integer' },
			},
		},
		provenance: 'auto',
		generatedFrom: { type: 'storage', resource: 'job' },
	};

	return [jobSchema, taskSchema, literalSchema, fallbackSchema];
}

function makeDefaultPolicyMap(): IRPolicyMap {
	return {
		sourcePath: 'src/policy-map.ts',
		definitions: [
			{
				key: 'jobs.create',
				capability: 'manage_options',
				appliesTo: 'resource',
				source: 'map',
			},
		],
		fallback: {
			capability: 'manage_options',
			appliesTo: 'resource',
		},
		missing: [],
		unused: [],
		warnings: [],
	} satisfies IRPolicyMap;
}

function makeDefaultResources(): IRResource[] {
	const jobResource = makeJobResource();
	const taskResource = makeTaskResource();
	const literalResource = makeLiteralResource();
	const orphanResource = makeOrphanResource();
	const remoteResource = makeRemoteResource();

	return [
		jobResource,
		taskResource,
		literalResource,
		orphanResource,
		remoteResource,
	];
}

export interface MakeResourceOptions {
	readonly name?: string;
	readonly routes?: IRRoute[];
	readonly hash?: string;
	readonly identity?: IRResource['identity'];
}

type WpPostStorage = Extract<
	NonNullable<IRResource['storage']>,
	{ mode: 'wp-post' }
>;
type ExtendedPostMetaDescriptor = ResourcePostMetaDescriptor & {
	items?: ResourcePostMetaDescriptor;
	enum?: readonly string[];
};
type ExtendedWpPostStorage = WpPostStorage & {
	cacheTtl?: number;
	retryLimit?: number;
	revision?: bigint;
	meta?: Record<string, ExtendedPostMetaDescriptor>;
};

export function makeJobResource(options: MakeResourceOptions = {}): IRResource {
	const cacheKeys: IRResource['cacheKeys'] = {
		list: { segments: ['job', 'list'] as const, source: 'config' },
		get: {
			segments: ['job', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
		create: { segments: ['job', 'create'] as const, source: 'config' },
		update: { segments: ['job', 'update'] as const, source: 'config' },
		remove: { segments: ['job', 'remove'] as const, source: 'config' },
	};

	const queryParams: NonNullable<IRResource['queryParams']> = {
		search: {
			type: 'string',
			description: 'Search term',
			optional: true,
		},
		log_path: {
			type: 'string',
			description: 'Windows log path for debugging',
		},
		status: {
			type: 'enum',
			enum: ['draft', 'published'] as const,
		},
		state: {
			type: 'enum',
			enum: ['draft', 'published'] as const,
		},
	};

	const storage: ExtendedWpPostStorage = {
		mode: 'wp-post',
		postType: 'job',
		cacheTtl: 900,
	};

	return {
		name: options.name ?? 'job',
		schemaKey: 'job',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/jobs',
				hash: 'route-job-list',
				transport: 'local',
			},
			{
				method: 'GET',
				path: '/jobs/:id',
				hash: 'route-job-get',
				transport: 'local',
			},
			{
				method: 'POST',
				path: '/jobs',
				hash: 'route-job-create',
				transport: 'local',
				policy: 'jobs.create',
			},
			{
				method: 'PUT',
				path: '/jobs/:id',
				hash: 'route-job-update',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity ?? { type: 'number', param: 'id' },
		storage,
		queryParams,
		ui: undefined,
		hash: options.hash ?? 'resource-job',
		warnings: [],
	} satisfies IRResource;
}

export function makeTaskResource(
	options: MakeResourceOptions = {}
): IRResource {
	const cacheKeys: IRResource['cacheKeys'] = {
		list: { segments: ['task', 'list'] as const, source: 'config' },
		get: {
			segments: ['task', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	const storage: ExtendedWpPostStorage = {
		mode: 'wp-post',
		postType: 'task',
		supports: ['title', 'editor'],
		retryLimit: 2,
		revision: BigInt(3),
		meta: {
			status: { type: 'string', single: true },
			tags: {
				type: 'array',
				single: false,
				items: { type: 'string' },
			},
		},
	};

	return {
		name: options.name ?? 'task',
		schemaKey: 'auto:task',
		schemaProvenance: 'auto',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/tasks/:slug',
				hash: 'route-task-list',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-task',
		warnings: [],
	} satisfies IRResource;
}

export function makeLiteralResource(
	options: MakeResourceOptions = {}
): IRResource {
	const cacheKeys: IRResource['cacheKeys'] = {
		list: { segments: ['literal', 'list'] as const, source: 'config' },
		get: {
			segments: ['literal', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	return {
		name: options.name ?? 'literal',
		schemaKey: 'literal',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/demo-namespace/literal',
				hash: 'route-literal-get',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-literal',
		warnings: [],
	} satisfies IRResource;
}

export function makeOrphanResource(
	options: MakeResourceOptions = {}
): IRResource {
	const cacheKeys: IRResource['cacheKeys'] = {
		list: { segments: ['orphan', 'list'] as const, source: 'config' },
		get: {
			segments: ['orphan', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	return {
		name: options.name ?? 'orphan',
		schemaKey: 'missing',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: '/orphans',
				hash: 'route-orphan-list',
				transport: 'local',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-orphan',
		warnings: [],
	} satisfies IRResource;
}

export function makeRemoteResource(
	options: MakeResourceOptions = {}
): IRResource {
	const cacheKeys: IRResource['cacheKeys'] = {
		list: { segments: ['remote', 'list'] as const, source: 'config' },
		get: {
			segments: ['remote', 'get', '__wpk_id__'] as const,
			source: 'default',
		},
	};

	return {
		name: options.name ?? 'remote',
		schemaKey: 'job',
		schemaProvenance: 'manual',
		routes: options.routes ?? [
			{
				method: 'GET',
				path: 'https://api.example.com/jobs',
				hash: 'route-remote-list',
				transport: 'remote',
			},
		],
		cacheKeys,
		identity: options.identity,
		storage: undefined,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-remote',
		warnings: [],
	} satisfies IRResource;
}

export function makePhpProjectFixture(): IRv1['php'] {
	return {
		namespace: 'Demo\\Namespace',
		autoload: 'inc/',
		outputDir: '.generated/php',
	} satisfies IRv1['php'];
}

export function makeBlocksFixture(): IRBlock[] {
	return [];
}
