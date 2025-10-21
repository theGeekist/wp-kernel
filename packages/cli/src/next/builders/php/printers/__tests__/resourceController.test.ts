import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRResource, IRRoute, IRv1 } from '../../../../ir/types';
import { collectCanonicalBasePaths } from '../routes';
import { createRouteMetadata } from '../resourceController/metadata';
import type { ResolvedIdentity } from '../identity';
import type { BuilderOutput } from '../../../runtime/types';
import type { Workspace } from '../../../workspace/types';
import {
	createPhpChannelHelper,
	createPhpResourceControllerHelper,
	getPhpBuilderChannel,
} from '../index';

function createReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function createWorkspace(): Workspace {
	return {
		root: process.cwd(),
		cwd: jest.fn(() => process.cwd()),
		read: jest.fn(async () => null),
		readText: jest.fn(async () => null),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
		exists: jest.fn(async () => false),
		rm: jest.fn(async () => undefined),
		glob: jest.fn(async () => []),
		threeWayMerge: jest.fn(async () => 'clean'),
		begin: jest.fn(),
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		dryRun: jest.fn(async (fn) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		})),
		tmpDir: jest.fn(async () => '.tmp'),
		resolve: jest.fn((...parts: string[]) =>
			path.join(process.cwd(), ...parts)
		),
	} as unknown as Workspace;
}

describe('createPhpResourceControllerHelper', () => {
	it('queues resource controllers with resolved identity and route kinds', async () => {
		const reporter = createReporter();
		const workspace = createWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const ir = createIr();

		const applyOptions = {
			context,
			input: {
				phase: 'generate' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			output,
			reporter,
		};

		await createPhpChannelHelper().apply(applyOptions, undefined);
		await createPhpResourceControllerHelper().apply(
			applyOptions,
			undefined
		);

		const channel = getPhpBuilderChannel(context);
		const entry = channel
			.pending()
			.find(
				(candidate) => candidate.metadata.kind === 'resource-controller'
			);

		expect(entry).toBeDefined();
		expect(entry?.metadata).toMatchObject({
			kind: 'resource-controller',
			identity: { type: 'string', param: 'slug' },
		});
		if (entry?.metadata.kind === 'resource-controller') {
			expect(entry.metadata.routes).toEqual([
				{
					method: 'GET',
					path: '/kernel/v1/books',
					kind: 'list',
				},
				{
					method: 'GET',
					path: '/kernel/v1/books/:slug',
					kind: 'get',
				},
				{
					method: 'POST',
					path: '/kernel/v1/books',
					kind: 'create',
					cacheSegments: ['books', 'create'],
					tags: { 'resource.wpPost.mutation': 'create' },
				},
				{
					method: 'PUT',
					path: '/kernel/v1/books/:slug',
					kind: 'update',
					cacheSegments: ['books', 'update'],
					tags: { 'resource.wpPost.mutation': 'update' },
				},
				{
					method: 'DELETE',
					path: '/kernel/v1/books/:slug',
					kind: 'remove',
					cacheSegments: ['books', 'remove'],
					tags: { 'resource.wpPost.mutation': 'delete' },
				},
			]);
		}
		expect(entry?.docblock).toMatchSnapshot('resource-controller-docblock');
		expect(entry?.statements).toMatchSnapshot(
			'resource-controller-statements'
		);
		expect(entry?.program).toMatchSnapshot('resource-controller-ast');
	});
});

describe('createRouteMetadata', () => {
	it('annotates mutation routes with cache segments and contract tags', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource: IRResource = {
			name: 'books',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				list: { segments: ['books', 'list'], source: 'default' },
				get: { segments: ['books', 'get'], source: 'default' },
				create: { segments: ['books', 'create'], source: 'default' },
				update: { segments: ['books', 'update'], source: 'default' },
				remove: { segments: ['books', 'remove'], source: 'default' },
			},
			identity,
			storage: {
				mode: 'wp-post',
				postType: 'book',
				statuses: [],
				supports: [],
				meta: {},
				taxonomies: {},
			} as IRResource['storage'],
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-hash',
			warnings: [],
		};

		const routes: IRRoute[] = [
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

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = createRouteMetadata({
			routes,
			identity,
			canonicalBasePaths,
			resource,
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/kernel/v1/books',
				kind: 'create',
				cacheSegments: ['books', 'create'],
				tags: { 'resource.wpPost.mutation': 'create' },
			},
			{
				method: 'PUT',
				path: '/kernel/v1/books/:slug',
				kind: 'update',
				cacheSegments: ['books', 'update'],
				tags: { 'resource.wpPost.mutation': 'update' },
			},
			{
				method: 'DELETE',
				path: '/kernel/v1/books/:slug',
				kind: 'remove',
				cacheSegments: ['books', 'remove'],
				tags: { 'resource.wpPost.mutation': 'delete' },
			},
		]);
	});

	it('omits mutation metadata when storage is not wp-post', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource: IRResource = {
			name: 'books',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: { segments: ['create'], source: 'default' },
				update: { segments: ['update'], source: 'default' },
				remove: { segments: ['remove'], source: 'default' },
			},
			identity,
			storage: undefined,
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-hash',
			warnings: [],
		};

		const routes: IRRoute[] = [
			{
				method: 'POST',
				path: '/kernel/v1/books',
				policy: undefined,
				hash: 'create',
				transport: 'local',
			},
			{
				method: 'GET',
				path: '/kernel/v1/books',
				policy: undefined,
				hash: 'list',
				transport: 'local',
			},
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = createRouteMetadata({
			routes,
			identity,
			canonicalBasePaths,
			resource,
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/kernel/v1/books',
				kind: 'custom',
			},
			{
				method: 'GET',
				path: '/kernel/v1/books',
				kind: 'custom',
			},
		]);
	});

	it('falls back to empty segments when mutation cache keys are undefined', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource: IRResource = {
			name: 'books',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: undefined,
				update: undefined,
				remove: undefined,
			},
			identity,
			storage: {
				mode: 'wp-post',
				postType: 'book',
				statuses: [],
				supports: [],
				meta: {},
				taxonomies: {},
			} as IRResource['storage'],
			queryParams: undefined,
			ui: undefined,
			hash: 'resource-hash',
			warnings: [],
		};

		const routes: IRRoute[] = [
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

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = createRouteMetadata({
			routes,
			identity,
			canonicalBasePaths,
			resource,
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/kernel/v1/books',
				kind: 'create',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'create' },
			},
			{
				method: 'PUT',
				path: '/kernel/v1/books/:slug',
				kind: 'update',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'update' },
			},
			{
				method: 'DELETE',
				path: '/kernel/v1/books/:slug',
				kind: 'remove',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'delete' },
			},
		]);
	});
});

function createIr(): IRv1 {
	const resource: IRResource = {
		name: 'books',
		schemaKey: 'book',
		schemaProvenance: 'manual',
		routes: createRoutes(),
		cacheKeys: {
			list: { segments: ['books', 'list'], source: 'default' },
			get: { segments: ['books', 'get'], source: 'default' },
			create: { segments: ['books', 'create'], source: 'default' },
			update: { segments: ['books', 'update'], source: 'default' },
			remove: { segments: ['books', 'remove'], source: 'default' },
		},
		identity: { type: 'string' },
		storage: {
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
		} as IRResource['storage'],
		queryParams: undefined,
		ui: undefined,
		hash: 'resource-hash',
		warnings: [],
	};

	return {
		meta: {
			version: 1,
			namespace: 'demo-plugin',
			sanitizedNamespace: 'DemoPlugin',
			origin: 'kernel.config.ts',
			sourcePath: 'kernel.config.ts',
		},
		config: {
			version: 1,
			namespace: 'demo-plugin',
			schemas: {},
			resources: {},
		} as IRv1['config'],
		schemas: [],
		resources: [resource],
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
	};
}

function createRoutes(): IRRoute[] {
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
