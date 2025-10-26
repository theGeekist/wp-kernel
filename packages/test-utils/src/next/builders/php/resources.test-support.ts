import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { IRRoute, IRResource, IRv1 } from '@wpkernel/cli/ir';

type WpPostStorageConfig = Extract<IRResource['storage'], { mode: 'wp-post' }>;
type WpTaxonomyStorageConfig = Extract<
	IRResource['storage'],
	{ mode: 'wp-taxonomy' }
>;
type WpOptionStorageConfig = Extract<
	IRResource['storage'],
	{ mode: 'wp-option' }
>;
type TransientStorageConfig = Extract<
	IRResource['storage'],
	{ mode: 'transient' }
>;

const DEFAULT_CACHE_KEYS: IRResource['cacheKeys'] = {
	list: { segments: ['books', 'list'], source: 'default' },
	get: { segments: ['books', 'get'], source: 'default' },
	create: { segments: ['books', 'create'], source: 'default' },
	update: { segments: ['books', 'update'], source: 'default' },
	remove: { segments: ['books', 'remove'], source: 'default' },
};

export interface MakeWpPostResourceOptions {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly identity?: IRResource['identity'];
	readonly storage?: Partial<WpPostStorageConfig>;
	readonly hash?: string;
}

export function makeWpPostRoutes(): IRRoute[] {
	return [
		{
			method: 'GET',
			path: '/kernel/v1/books',
			policy: undefined,
			hash: 'list',
			transport: 'local',
		},
		{
			method: 'GET',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'get',
			transport: 'local',
		},
		{
			method: 'POST',
			path: '/kernel/v1/books',
			policy: undefined,
			hash: 'create',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'update',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/kernel/v1/books/:slug',
			policy: undefined,
			hash: 'remove',
			transport: 'local',
		},
	];
}

export function makeWpPostResource(
	options: MakeWpPostResourceOptions = {}
): IRResource {
	const storage: WpPostStorageConfig = {
		mode: 'wp-post',
		postType: 'book',
		statuses: ['draft', 'publish'],
		supports: ['title'],
		meta: {
			status: { type: 'string', single: true },
			tags: { type: 'array', single: false },
		},
		taxonomies: {
			genres: { taxonomy: 'book_genre' },
		},
		...options.storage,
	};

	return {
		name: options.name ?? 'books',
		schemaKey: options.schemaKey ?? 'book',
		schemaProvenance: 'manual',
		routes: options.routes ?? makeWpPostRoutes(),
		cacheKeys: options.cacheKeys ?? DEFAULT_CACHE_KEYS,
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'resource-hash',
		warnings: [],
	} satisfies IRResource;
}

export interface MakeWpTaxonomyResourceOptions {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly identity?: IRResource['identity'];
	readonly storage?: Partial<WpTaxonomyStorageConfig>;
	readonly hash?: string;
}

export function makeWpTaxonomyResource(
	options: MakeWpTaxonomyResourceOptions = {}
): IRResource {
	const storage: WpTaxonomyStorageConfig = {
		mode: 'wp-taxonomy',
		taxonomy: 'job_category',
		hierarchical: true,
		...options.storage,
	};

	return {
		name: options.name ?? 'jobCategories',
		schemaKey: options.schemaKey ?? 'jobCategory',
		schemaProvenance: 'manual',
		routes:
			options.routes ??
			([
				{
					method: 'GET',
					path: '/kernel/v1/job-categories',
					policy: undefined,
					hash: 'taxonomy-list',
					transport: 'local',
				},
				{
					method: 'GET',
					path: '/kernel/v1/job-categories/:slug',
					policy: undefined,
					hash: 'taxonomy-get',
					transport: 'local',
				},
			] satisfies IRRoute[]),
		cacheKeys: options.cacheKeys ?? {
			list: {
				segments: ['jobCategories', 'list'],
				source: 'default',
			},
			get: {
				segments: ['jobCategories', 'get'],
				source: 'default',
			},
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity: options.identity ?? { type: 'string', param: 'slug' },
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'taxonomy-resource',
		warnings: [],
	} satisfies IRResource;
}

export interface MakeWpOptionResourceOptions {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly storage?: Partial<WpOptionStorageConfig>;
	readonly hash?: string;
}

export function makeWpOptionResource(
	options: MakeWpOptionResourceOptions = {}
): IRResource {
	const storage: WpOptionStorageConfig = {
		mode: 'wp-option',
		option: 'demo_option',
		...options.storage,
	};

	const defaultRoutes: IRRoute[] = [
		{
			method: 'GET',
			path: '/kernel/v1/demo-option',
			policy: undefined,
			hash: 'wp-option-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/kernel/v1/demo-option',
			policy: undefined,
			hash: 'wp-option-update',
			transport: 'local',
		},
	];

	return {
		name: options.name ?? 'demoOption',
		schemaKey: options.schemaKey ?? 'demoOption',
		schemaProvenance: 'manual',
		routes: options.routes ?? defaultRoutes,
		cacheKeys:
			options.cacheKeys ??
			({
				list: { segments: ['demoOption', 'list'], source: 'default' },
				get: { segments: ['demoOption', 'get'], source: 'default' },
				update: {
					segments: ['demoOption', 'update'],
					source: 'default',
				},
				remove: {
					segments: ['demoOption', 'remove'],
					source: 'default',
				},
			} satisfies IRResource['cacheKeys']),
		identity: undefined,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'wp-option-resource',
		warnings: [],
	} satisfies IRResource;
}

export interface MakeTransientResourceOptions {
	readonly name?: string;
	readonly schemaKey?: string;
	readonly routes?: IRRoute[];
	readonly cacheKeys?: IRResource['cacheKeys'];
	readonly storage?: Partial<TransientStorageConfig>;
	readonly hash?: string;
	readonly identity?: IRResource['identity'];
}

export function makeTransientResource(
	options: MakeTransientResourceOptions = {}
): IRResource {
	const storage: TransientStorageConfig = {
		mode: 'transient',
		...options.storage,
	};

	const defaultRoutes: IRRoute[] = [
		{
			method: 'GET',
			path: '/kernel/v1/job-cache',
			policy: undefined,
			hash: 'transient-get',
			transport: 'local',
		},
		{
			method: 'PUT',
			path: '/kernel/v1/job-cache',
			policy: undefined,
			hash: 'transient-set',
			transport: 'local',
		},
		{
			method: 'DELETE',
			path: '/kernel/v1/job-cache',
			policy: undefined,
			hash: 'transient-delete',
			transport: 'local',
		},
	];

	const cacheKeys =
		options.cacheKeys ??
		({
			list: { segments: ['jobCache', 'list'], source: 'default' },
			get: { segments: ['jobCache', 'get'], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: ['jobCache', 'update'], source: 'default' },
			remove: { segments: ['jobCache', 'remove'], source: 'default' },
		} satisfies IRResource['cacheKeys']);

	return {
		name: options.name ?? 'jobCache',
		schemaKey: options.schemaKey ?? 'jobCache',
		schemaProvenance: 'manual',
		routes: options.routes ?? defaultRoutes,
		cacheKeys,
		identity: options.identity,
		storage,
		queryParams: undefined,
		ui: undefined,
		hash: options.hash ?? 'transient-resource',
		warnings: [],
	} satisfies IRResource;
}

export interface MakePhpIrFixtureOptions {
	readonly resources?: IRResource[];
}

export function makePhpIrFixture(options: MakePhpIrFixtureOptions = {}): IRv1 {
	const resources = options.resources ?? [
		makeWpPostResource(),
		makeWpTaxonomyResource(),
		makeWpOptionResource(),
		makeTransientResource(),
	];

	return {
		meta: {
			version: 1,
			namespace: 'demo-plugin',
			sanitizedNamespace: 'DemoPlugin',
			origin: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			sourcePath: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
		},
		config: {
			version: 1,
			namespace: 'demo-plugin',
			schemas: {},
			resources: {},
		},
		schemas: [],
		resources,
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
			namespace: 'Demo\\Plugin',
			autoload: 'inc/',
			outputDir: '.generated/php',
		},
	} satisfies IRv1;
}
