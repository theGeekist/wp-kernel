import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { KernelConfigV1 } from '../src/config/types';
import type {
	IRBlock,
	IRPolicyMap,
	IRResource,
	IRRoute,
	IRSchema,
	IRv1,
} from '../src/ir';
import type { ResourcePostMetaDescriptor } from '@wpkernel/core/resource';

export interface CreateKernelConfigFixtureOptions {
	readonly namespace?: string;
	readonly schemas?: KernelConfigV1['schemas'];
	readonly resources?: KernelConfigV1['resources'];
	readonly adapters?: KernelConfigV1['adapters'];
}

export function createKernelConfigFixture(
	options: CreateKernelConfigFixtureOptions = {}
): KernelConfigV1 {
	const defaultSchemas: KernelConfigV1['schemas'] = {
		job: {
			path: './contracts/job.schema.json',
			generated: {
				types: './.generated/../types/job.d.ts',
			},
		},
	};
	const defaultResources: KernelConfigV1['resources'] = {};

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
	} satisfies KernelConfigV1;
}

export interface CreatePrinterIrFixtureOptions {
	readonly config?: KernelConfigV1;
	readonly schemas?: IRSchema[];
	readonly resources?: IRResource[];
	readonly policyMap?: IRPolicyMap;
	readonly policies?: IRv1['policies'];
	readonly blocks?: IRBlock[];
	readonly php?: IRv1['php'];
	readonly meta?: Partial<IRv1['meta']>;
	readonly diagnostics?: IRv1['diagnostics'];
}

export function createPrinterIrFixture(
	options: CreatePrinterIrFixtureOptions = {}
): IRv1 {
	const config = options.config ?? createKernelConfigFixture();
	const sourcePath =
		options.meta?.sourcePath ?? WPK_CONFIG_SOURCES.WPK_CONFIG_TS;
	const origin = options.meta?.origin ?? WPK_CONFIG_SOURCES.WPK_CONFIG_TS;

	const meta: IRv1['meta'] = {
		version: 1,
		namespace: options.meta?.namespace ?? 'demo-namespace',
		sourcePath,
		origin,
		sanitizedNamespace:
			options.meta?.sanitizedNamespace ?? 'Demo\\Namespace',
	};

	return {
		meta,
		config,
		schemas: options.schemas ?? createDefaultSchemas(),
		resources: options.resources ?? createDefaultResources(),
		policies: options.policies ?? [],
		policyMap: options.policyMap ?? createDefaultPolicyMap(),
		blocks: options.blocks ?? [],
		php: options.php ?? {
			namespace: 'Demo\\Namespace',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
		...(options.diagnostics ? { diagnostics: options.diagnostics } : {}),
	} satisfies IRv1;
}

export function createDefaultSchemas(): IRSchema[] {
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

function createDefaultPolicyMap(): IRPolicyMap {
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

function createDefaultResources(): IRResource[] {
	const jobResource = createJobResource();
	const taskResource = createTaskResource();
	const literalResource = createLiteralResource();
	const orphanResource = createOrphanResource();
	const remoteResource = createRemoteResource();

	return [
		jobResource,
		taskResource,
		literalResource,
		orphanResource,
		remoteResource,
	];
}

export interface CreateResourceOptions {
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

export function createJobResource(
	options: CreateResourceOptions = {}
): IRResource {
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

export function createTaskResource(
	options: CreateResourceOptions = {}
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

export function createLiteralResource(
	options: CreateResourceOptions = {}
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

export function createOrphanResource(
	options: CreateResourceOptions = {}
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

export function createRemoteResource(
	options: CreateResourceOptions = {}
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

export function createPhpProjectFixture(): IRv1['php'] {
	return {
		namespace: 'Demo\\Namespace',
		autoload: 'inc/',
		outputDir: '.generated/php',
	} satisfies IRv1['php'];
}

export function createBlocksFixture(): IRBlock[] {
	return [];
}
