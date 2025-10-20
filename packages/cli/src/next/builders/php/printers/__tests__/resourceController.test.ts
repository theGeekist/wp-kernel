import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type { IRResource, IRRoute, IRv1 } from '../../../../ir/types';
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
			]);
		}
		expect(entry?.docblock).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Route: [GET] /kernel/v1/books'),
				expect.stringContaining('Route: [GET] /kernel/v1/books/:slug'),
			])
		);
		expect(entry?.statements).toEqual(
			expect.arrayContaining([
				expect.stringContaining('@wp-kernel route-kind list'),
				expect.stringContaining('@wp-kernel route-kind get'),
				expect.stringContaining(
					"$slug = $request->get_param( 'slug' );"
				),
			])
		);
		expect(entry?.program).toMatchSnapshot('resource-controller-ast');
	});
});

function createIr(): IRv1 {
	const resource: IRResource = {
		name: 'books',
		schemaKey: 'book',
		schemaProvenance: 'manual',
		routes: createRoutes(),
		cacheKeys: {
			list: { segments: [], source: 'default' },
			get: { segments: [], source: 'default' },
			create: { segments: [], source: 'default' },
			update: { segments: [], source: 'default' },
			remove: { segments: [], source: 'default' },
		},
		identity: { type: 'string' },
		storage: undefined,
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
	];
}
