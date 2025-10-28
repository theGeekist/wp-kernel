import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	collectCanonicalBasePaths,
	buildResourceControllerRouteMetadata,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../ir/publicTypes';
import type { ResolvedIdentity } from '../identity';
import type { BuilderOutput } from '../../../runtime/types';
import type { Workspace } from '../../../workspace/types';
import { makeWorkspaceMock } from '../../../../../tests/workspace.test-support';
import * as phpDriver from '@wpkernel/php-driver';
import {
	makePhpIrFixture,
	makeWpPostResource,
	makeWpPostRoutes,
	makeWpTaxonomyResource,
	makeWpOptionResource,
	makeTransientResource,
} from '@wpkernel/test-utils/next/builders/php/resources.test-support';
import { WP_POST_MUTATION_CONTRACT } from '../resource/wpPost/mutations';
import {
	createPhpChannelHelper,
	createPhpResourceControllerHelper,
	createPhpProgramWriterHelper,
	getPhpBuilderChannel,
} from '../index';

function buildReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildWorkspace(): Workspace {
	const root = process.cwd();
	return makeWorkspaceMock({
		root,
		cwd: () => root,
		resolve: (...parts: string[]) => path.join(root, ...parts),
	});
}

describe('createPhpResourceControllerHelper', () => {
	it('queues resource controllers with resolved identity and route kinds', async () => {
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const ir = buildIr();

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
					cacheSegments: ['books', 'list'],
				},
				{
					method: 'GET',
					path: '/kernel/v1/books/:slug',
					kind: 'get',
					cacheSegments: ['books', 'get'],
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
		expect(entry?.statements).toEqual([]);
		expect(entry?.program).toMatchSnapshot('resource-controller-ast');
		const warnings = (reporter.warn as jest.Mock).mock.calls;
		expect(warnings.length).toBeGreaterThanOrEqual(3);
		expect(warnings).toEqual(
			expect.arrayContaining([
				[
					'Write route missing policy.',
					{
						resource: 'books',
						method: 'POST',
						path: '/kernel/v1/books',
					},
				],
				[
					'Write route missing policy.',
					{
						resource: 'books',
						method: 'PUT',
						path: '/kernel/v1/books/:slug',
					},
				],
				[
					'Write route missing policy.',
					{
						resource: 'books',
						method: 'DELETE',
						path: '/kernel/v1/books/:slug',
					},
				],
			])
		);
	});

	it('queues taxonomy controllers with pagination helpers and term shaping', async () => {
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const ir = buildIr();

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
		const taxonomyEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'jobCategories'
			);

		expect(taxonomyEntry).toBeDefined();
		expect(taxonomyEntry?.metadata).toMatchObject({
			name: 'jobCategories',
			routes: [
				{
					method: 'GET',
					path: '/kernel/v1/job-categories',
					kind: 'list',
				},
				{
					method: 'GET',
					path: '/kernel/v1/job-categories/:slug',
					kind: 'get',
				},
			],
		});

		expect(taxonomyEntry?.docblock).toMatchSnapshot(
			'taxonomy-controller-docblock'
		);
		expect(taxonomyEntry?.statements).toEqual([]);
		expect(taxonomyEntry?.program).toMatchSnapshot(
			'taxonomy-controller-ast'
		);
	});

	it('queues wp-option controllers with autoload helpers', async () => {
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const ir = makePhpIrFixture({
			resources: [makeWpOptionResource()],
		});

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
		const optionEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'demoOption'
			);

		expect(optionEntry).toBeDefined();
		expect(optionEntry?.metadata).toMatchObject({
			name: 'demoOption',
			routes: [
				{
					method: 'GET',
					path: '/kernel/v1/demo-option',
					kind: 'custom',
				},
				{
					method: 'PUT',
					path: '/kernel/v1/demo-option',
					kind: 'custom',
				},
			],
		});

		expect(optionEntry?.docblock).toMatchSnapshot(
			'wp-option-controller-docblock'
		);
		expect(optionEntry?.statements).toEqual([]);
		expect(optionEntry?.program).toMatchSnapshot(
			'wp-option-controller-ast'
		);

		if (!optionEntry) {
			throw new Error('Expected wp-option controller entry.');
		}

		const prettyPrinter = {
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// demo-option controller\n',
				ast: program,
			})),
		};
		const prettyPrinterSpy = jest
			.spyOn(phpDriver, 'buildPhpPrettyPrinter')
			.mockReturnValue(prettyPrinter as never);

		try {
			const writerHelper = createPhpProgramWriterHelper();
			await writerHelper.apply(applyOptions, undefined);

			expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
				filePath: optionEntry.file,
				program: optionEntry.program,
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: optionEntry.file,
				contents: expect.stringContaining('// demo-option controller'),
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: `${optionEntry.file}.ast.json`,
				contents: expect.stringContaining('Stmt_ClassMethod'),
			});
		} finally {
			prettyPrinterSpy.mockRestore();
		}
	});

	it('queues transient controllers with TTL helpers and cache metadata', async () => {
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const ir = makePhpIrFixture({
			resources: [makeTransientResource()],
		});

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
		const transientEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'jobCache'
			);

		expect(transientEntry).toBeDefined();
		expect(transientEntry?.metadata).toMatchObject({
			name: 'jobCache',
			routes: [
				{ method: 'GET', path: '/kernel/v1/job-cache', kind: 'custom' },
				{ method: 'PUT', path: '/kernel/v1/job-cache', kind: 'custom' },
				{
					method: 'DELETE',
					path: '/kernel/v1/job-cache',
					kind: 'custom',
				},
			],
		});
		expect(transientEntry?.docblock).toMatchSnapshot(
			'transient-controller-docblock'
		);
		expect(transientEntry?.statements).toEqual([]);
		expect(transientEntry?.program).toMatchSnapshot(
			'transient-controller-ast'
		);

		if (!transientEntry) {
			throw new Error('Expected transient controller entry.');
		}

		const prettyPrinter = {
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// job-cache controller\n',
				ast: program,
			})),
		};
		const prettyPrinterSpy = jest
			.spyOn(phpDriver, 'buildPhpPrettyPrinter')
			.mockReturnValue(prettyPrinter as never);

		try {
			const writerHelper = createPhpProgramWriterHelper();
			await writerHelper.apply(applyOptions, undefined);

			expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
				filePath: transientEntry.file,
				program: transientEntry.program,
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: transientEntry.file,
				contents: expect.stringContaining('// job-cache controller'),
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: `${transientEntry.file}.ast.json`,
				contents: expect.stringContaining(
					'normaliseJobCacheExpiration'
				),
			});
		} finally {
			prettyPrinterSpy.mockRestore();
		}
	});
});

describe('buildResourceControllerRouteMetadata', () => {
	it('annotates mutation routes with cache segments and contract tags', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource = makeWpPostResource();

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(allRoutes, (route) => route.method === 'PUT'),
			getRoute(allRoutes, (route) => route.method === 'DELETE'),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: {
				channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
			},
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
		const resource = makeWpTaxonomyResource({
			name: 'books',
			schemaKey: 'book',
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: { segments: ['create'], source: 'default' },
				update: { segments: ['update'], source: 'default' },
				remove: { segments: ['remove'], source: 'default' },
			},
		});

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(
				allRoutes,
				(route) =>
					route.method === 'GET' &&
					!route.path.includes(`:${identity.param}`)
			),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: undefined,
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
		const resource = makeWpPostResource({
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: undefined,
				update: undefined,
				remove: undefined,
			},
		});

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(allRoutes, (route) => route.method === 'PUT'),
			getRoute(allRoutes, (route) => route.method === 'DELETE'),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: {
				channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
			},
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

function buildIr() {
	return makePhpIrFixture();
}

function buildCacheKeyPlan(resource: Pick<IRResource, 'cacheKeys'>) {
	return {
		list: { segments: resource.cacheKeys.list.segments },
		get: { segments: resource.cacheKeys.get.segments },
		create: resource.cacheKeys.create
			? { segments: resource.cacheKeys.create.segments }
			: undefined,
		update: resource.cacheKeys.update
			? { segments: resource.cacheKeys.update.segments }
			: undefined,
		remove: resource.cacheKeys.remove
			? { segments: resource.cacheKeys.remove.segments }
			: undefined,
	} as const;
}

function getRoute(
	routes: ReturnType<typeof makeWpPostRoutes>,
	matcher: (route: ReturnType<typeof makeWpPostRoutes>[number]) => boolean
) {
	const route = routes.find(matcher);
	if (!route) {
		throw new Error('Expected route to be defined.');
	}
	return route;
}
