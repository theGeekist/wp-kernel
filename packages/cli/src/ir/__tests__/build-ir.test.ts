import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { KernelError } from '@geekist/wp-kernel';
import type { KernelConfigV1 } from '../../config/types';
import { buildIr } from '../build-ir';

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__');
const FIXTURE_CONFIG_PATH = path.join(FIXTURE_ROOT, 'kernel.config.ts');
const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-ir-test-');

function createBaseConfig(): KernelConfigV1 {
	return {
		version: 1,
		namespace: 'test-namespace',
		schemas: {},
		resources: {},
	} as unknown as KernelConfigV1;
}

async function withTempSchema(
	contents: string,
	run: (schemaPath: string) => Promise<void>
): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);
	const schemaPath = path.join(tempDir, 'temp.schema.json');
	await fs.writeFile(schemaPath, contents, 'utf8');

	try {
		await run(schemaPath);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

function canonicalHash(value: unknown): string {
	return createHash('sha256')
		.update(
			JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n'),
			'utf8'
		)
		.digest('hex');
}

function sortValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sortValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, sortValue(val)] as const)
			.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

		return Object.fromEntries(entries) as T;
	}

	if (typeof value === 'undefined') {
		return null as unknown as T;
	}

	return value;
}

describe('buildIr', () => {
	it('constructs a deterministic IR for manual schemas', async () => {
		const schemaPath = path.join(FIXTURE_ROOT, 'schemas/todo.schema.json');
		const config = createBaseConfig();
		config.schemas = {
			todo: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/todo.d.ts' },
			},
		} as KernelConfigV1['schemas'];

		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: { path: '/test/v1/todos', method: 'GET' },
					get: { path: '/test/v1/todos/:id', method: 'GET' },
					create: {
						path: '/test/v1/todos',
						method: 'POST',
						policy: 'todos.create',
					},
				},
				cacheKeys: {
					list: () => ['todo', 'list'],
					get: (id?: string | number) => ['todo', 'get', id ?? null],
				},
				identity: { type: 'number', param: 'id' },
				storage: { mode: 'wp-post', postType: 'todo' },
				queryParams: {
					status: { type: 'string', optional: true },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.meta).toEqual({
			version: 1,
			namespace: 'test-namespace',
			sourcePath: path.relative(process.cwd(), FIXTURE_CONFIG_PATH),
			origin: 'kernel.config.ts',
			sanitizedNamespace: 'test-namespace',
		});

		expect(ir.schemas).toHaveLength(1);
		const [schema] = ir.schemas;
		expect(schema.key).toBe('todo');
		expect(schema.provenance).toBe('manual');
		expect(schema.generatedFrom).toBeUndefined();
		expect(schema.sourcePath).toBe(
			path.relative(process.cwd(), schemaPath)
		);

		expect(schema.hash).toBe(canonicalHash(schema.schema));

		expect(ir.resources).toHaveLength(1);
		const [resource] = ir.resources;
		expect(resource.schemaKey).toBe('todo');
		expect(resource.schemaProvenance).toBe('manual');
		expect(resource.cacheKeys.list.source).toBe('config');
		expect(resource.cacheKeys.get.segments).toEqual([
			'todo',
			'get',
			'__wpk_id__',
		]);
		expect(resource.identity).toEqual({ type: 'number', param: 'id' });
		expect(resource.storage).toEqual({ mode: 'wp-post', postType: 'todo' });
		expect(resource.routes.map((route) => route.hash)).toHaveLength(3);

		expect(ir.policies).toEqual([
			{ key: 'todos.create', source: 'resource' },
		]);

		expect(ir.php.namespace).toBe('Test\\Namespace');

		const secondRun = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(secondRun).toEqual(ir);
	});

	it('synthesises schemas when resources use auto mode', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			job: {
				name: 'job',
				schema: 'auto',
				routes: {
					list: { path: '/jobs/v1/jobs', method: 'GET' },
				},
				storage: {
					mode: 'wp-post',
					postType: 'wpk_job',
					meta: {
						department: { type: 'string', single: true },
						salary: { type: 'integer', single: true },
						tags: { type: 'string', single: false },
					},
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.schemas).toHaveLength(1);
		const [schema] = ir.schemas;
		expect(schema.key).toBe('auto:job');
		expect(schema.provenance).toBe('auto');
		expect(schema.generatedFrom).toEqual({
			type: 'storage',
			resource: 'job',
		});
		expect(schema.schema).toMatchObject({
			properties: {
				department: { type: 'string' },
				salary: { type: 'integer' },
				tags: { type: 'array', items: { type: 'string' } },
			},
		});

		expect(ir.resources[0].schemaProvenance).toBe('auto');
		expect(ir.resources[0].schemaKey).toBe('auto:job');
	});

	it('throws when duplicate routes are detected', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			first: {
				name: 'first',
				schema: 'auto',
				routes: {
					list: { path: '/conflict/v1/items', method: 'GET' },
				},
			},
			second: {
				name: 'second',
				schema: 'auto',
				routes: {
					list: { path: '/conflict/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('rejects reserved route prefixes', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			sample: {
				name: 'sample',
				schema: 'auto',
				routes: {
					list: { path: 'wp/v2/conflict', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('throws when namespace cannot be sanitised', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '/demo/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: '123plugin',
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('throws when schema path cannot be resolved', async () => {
		const config = createBaseConfig();
		config.schemas = {
			missing: {
				path: './unknown.schema.json',
				generated: { types: 'types/missing.d.ts' },
			},
		} as KernelConfigV1['schemas'];
		config.resources = {
			missing: {
				name: 'missing',
				schema: 'missing',
				routes: {
					list: { path: '/missing/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('throws when schema JSON is invalid', async () => {
		const config = createBaseConfig();
		await withTempSchema('{ invalid', async (schemaPath) => {
			config.schemas = {
				temp: {
					path: schemaPath,
					generated: { types: 'types/temp.d.ts' },
				},
			} as KernelConfigV1['schemas'];
			config.resources = {
				temp: {
					name: 'temp',
					schema: 'temp',
					routes: {
						list: { path: '/temp/v1/items', method: 'GET' },
					},
				},
			} as unknown as KernelConfigV1['resources'];

			await expect(
				buildIr({
					config,
					sourcePath: FIXTURE_CONFIG_PATH,
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				})
			).rejects.toBeInstanceOf(KernelError);
		});
	});

	it('throws when resource references unknown schema key', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: { path: '/todo/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('normalises complex route paths', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '//demo//v1/items/', method: 'GET' },
					update: { path: 'demo/v1/items/:id/', method: 'PUT' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		const paths = ir.resources[0].routes.map((route) => route.path);
		expect(paths).toEqual(['/demo/v1/items', '/demo/v1/items/:id']);
	});

	it('rejects absolute route URLs', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: 'https://example.com/api', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('rejects path traversal segments', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '../escape', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('derives default cache keys when not provided', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '/demo/v1/items', method: 'GET' },
					get: { path: '/demo/v1/items/:id', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		const cacheKeys = ir.resources[0].cacheKeys;
		expect(cacheKeys.list).toEqual({
			source: 'default',
			segments: ['demo', 'list'],
		});
		expect(cacheKeys.get).toEqual({
			source: 'default',
			segments: ['demo', 'get'],
		});
	});

	it('builds php namespace for single-segment slug', async () => {
		const config = createBaseConfig();
		config.namespace = 'solo';
		config.resources = {
			solo: {
				name: 'solo',
				schema: 'auto',
				routes: {
					list: { path: '/solo/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.php.namespace).toBe('Solo');
	});

	it('resolves schema path from workspace root', async () => {
		const schemaPath = path.relative(
			process.cwd(),
			path.join(FIXTURE_ROOT, 'schemas/todo.schema.json')
		);
		const config = createBaseConfig();
		config.schemas = {
			todo: {
				path: schemaPath,
				generated: { types: 'types/todo.d.ts' },
			},
		} as KernelConfigV1['schemas'];
		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: { path: '/workspace/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.schemas[0].sourcePath).toBe(schemaPath);
	});

	it('throws when cache key function returns invalid data', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '/demo/v1/items', method: 'GET' },
				},
				cacheKeys: {
					list: () => 'invalid' as unknown as unknown[],
				},
			},
		} as unknown as KernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(KernelError);
	});

	it('sorts resources deterministically by name', async () => {
		const config = createBaseConfig();
		config.schemas = {} as KernelConfigV1['schemas'];
		config.resources = {
			beta: {
				name: 'beta',
				schema: 'auto',
				routes: {
					list: { path: '/beta/v1/items', method: 'GET' },
				},
			},
			alpha: {
				name: 'alpha',
				schema: 'auto',
				routes: {
					list: { path: '/alpha/v1/items', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.resources.map((resource) => resource.name)).toEqual([
			'alpha',
			'beta',
		]);
	});

	it('sorts resources with matching names by schema key', async () => {
		const config = createBaseConfig();
		config.schemas = {
			first: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/first.d.ts' },
			},
			second: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/second.d.ts' },
			},
		} as KernelConfigV1['schemas'];
		config.resources = {
			one: {
				name: 'duplicate',
				schema: 'second',
				routes: {
					list: { path: '/duplicate/v1/items', method: 'GET' },
				},
			},
			two: {
				name: 'duplicate',
				schema: 'first',
				routes: {
					list: { path: '/duplicate/v1/other', method: 'GET' },
				},
			},
		} as unknown as KernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'kernel.config.ts',
			namespace: config.namespace,
		});

		expect(ir.resources.map((resource) => resource.schemaKey)).toEqual([
			'first',
			'second',
		]);
	});
});
