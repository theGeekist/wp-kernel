import path from 'node:path';
import { KernelError } from '@geekist/wp-kernel';
import type { KernelConfigV1 } from '../../config/types';
import { buildIr } from '../build-ir';
import {
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
	createBaseConfig,
	withTempSchema,
} from '../test-helpers';

describe('buildIr – validation', () => {
	it('throws when duplicate routes are detected', async () => {
		const config = createBaseConfig();
		config.resources = {
			first: {
				name: 'first',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
			second: {
				name: 'second',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
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

	it('rejects path traversal segments', async () => {
		const config = createBaseConfig();
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
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
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
						list: {
							path: '/test-namespace/v1/items',
							method: 'GET',
						},
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
		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
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
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
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

		expect(ir.schemas[0]?.sourcePath).toBe(schemaPath);
	});

	it('rejects empty route definitions', async () => {
		const config = createBaseConfig();
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '   ', method: 'GET' },
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

	it('throws when cache key function returns non-array values', async () => {
		const config = createBaseConfig();
		config.resources = {
			invalid: {
				name: 'invalid',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
				cacheKeys: {
					list: () => 'not-an-array' as unknown as unknown[],
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
