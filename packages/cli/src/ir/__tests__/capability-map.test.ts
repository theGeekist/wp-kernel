import path from 'node:path';
import fs from 'node:fs/promises';
import type { WPKernelConfigV1 } from '../../config/types';
import { buildIr } from '../buildIr';
import { setCachedTsImport } from '../../config/load-kernel-config';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';

describe('capability map integration', () => {
	afterEach(() => {
		setCachedTsImport(null);
	});

	it('falls back to defaults when capability map is missing', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.capabilityMap.definitions).toHaveLength(0);
				expect(ir.capabilityMap.missing.sort()).toEqual([
					'demo.create',
					'demo.get',
				]);
				expect(ir.capabilityMap.unused).toHaveLength(0);
				expect(ir.capabilityMap.fallback).toEqual({
					capability: 'manage_options',
					appliesTo: 'resource',
				});
				expect(
					ir.capabilityMap.warnings.map((warning) => warning.code)
				).toContain('capability-map.missing');
			}
		);
	});

	it('warns when capability map omits referenced entries', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'capability-map.cjs'),
					[
						'module.exports = {',
						'        capabilityMap: {',
						"                'demo.create': 'manage_options',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.capabilityMap.missing).toEqual(['demo.get']);
				expect(
					ir.capabilityMap.warnings.map((warning) => warning.code)
				).toContain('capability-map.entries.missing');
			}
		);
	});

	it('loads capability definitions from src/capability-map.ts', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'capability-map.cjs'),
					[
						'module.exports = {',
						'        capabilityMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'object' },",
						"                'unused.capability': 'read',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				const definitionMap = new Map(
					ir.capabilityMap.definitions.map((entry) => [
						entry.key,
						entry,
					])
				);

				expect(definitionMap.get('demo.create')).toEqual({
					key: 'demo.create',
					capability: 'manage_options',
					appliesTo: 'resource',
					source: 'map',
				});
				expect(definitionMap.get('demo.get')).toEqual({
					key: 'demo.get',
					capability: 'edit_post',
					appliesTo: 'object',
					binding: 'id',
					source: 'map',
				});

				expect(ir.capabilityMap.missing).toHaveLength(0);
				expect(ir.capabilityMap.unused).toEqual(['unused.capability']);
				expect(
					ir.capabilityMap.warnings.map((warning) => warning.code)
				).toContain('capability-map.entries.unused');
				expect(ir.capabilityMap.sourcePath).toBeDefined();
				expect(
					ir.capabilityMap.sourcePath
						?.replace(/\\/g, '/')
						?.endsWith('src/capability-map.cjs')
				).toBe(true);
			}
		);
	});

	it('warns when bindings cannot be inferred for object-scoped capabilities', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'capability-map.cjs'),
					[
						'module.exports = {',
						'        capabilityMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'object' },",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();
				(config.resources as Record<string, unknown>).secondary = {
					name: 'secondary',
					schema: 'auto',
					identity: { type: 'number', param: 'postId' },
					routes: {
						get: {
							path: '/test/v1/secondary/:postId',
							method: 'GET',
							capability: 'demo.get',
						},
					},
				};

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				const demoGet = ir.capabilityMap.definitions.find(
					(entry) => entry.key === 'demo.get'
				);
				expect(demoGet?.binding).toBeUndefined();
				expect(
					ir.capabilityMap.warnings.map((warning) => warning.code)
				).toContain('capability-map.binding.missing');
			}
		);
	});

	it('rejects capability map entries that resolve to unsupported values', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'capability-map.cjs'),
					[
						'module.exports = {',
						'        capabilityMap: {',
						"                'demo.create': () => 42,",
						"                'demo.get': async () => 'edit_post',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();

				await expect(
					buildIr({
						config,
						sourcePath: path.join(workspace, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					code: 'ValidationError',
					context: expect.objectContaining({
						capability: 'demo.create',
					}),
					message: expect.stringContaining(
						'must resolve to a capability string'
					),
				});
			}
		);
	});

	it('rejects descriptors with invalid appliesTo scope', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'wpk.config.ts'),
					'export const wpkConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'capability-map.cjs'),
					[
						'module.exports = {',
						'        capabilityMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'objectt' },",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createCapabilityConfig();

				await expect(
					buildIr({
						config,
						sourcePath: path.join(workspace, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					code: 'ValidationError',
					context: expect.objectContaining({
						capability: 'demo.get',
					}),
					message: expect.stringContaining('invalid appliesTo scope'),
				});
			}
		);
	});
});

function createCapabilityConfig(): WPKernelConfigV1 {
	const config = createBaseConfig();
	config.resources = {
		demo: {
			name: 'demo',
			schema: 'auto',
			identity: { type: 'number', param: 'id' },
			routes: {
				create: {
					path: '/test/v1/demo',
					method: 'POST',
					capability: 'demo.create',
				},
				get: {
					path: '/test/v1/demo/:id',
					method: 'GET',
					capability: 'demo.get',
				},
			},
		},
	} as unknown as WPKernelConfigV1['resources'];

	return config;
}
it('resolves ts-based capability maps with async descriptors', async () => {
	const tsModule = {
		default: {
			'demo.create': async () => 'manage_options',
			'demo.get': async () => ({
				capability: 'edit_post',
				appliesTo: 'object',
				binding: ' postId ',
			}),
		},
	};

	setCachedTsImport(Promise.resolve(async () => tsModule));

	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'wpk.config.ts'),
				'export const wpkConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'capability-map.ts'),
				'// module handled via injected tsImport',
				'utf8'
			);
		},
		async (workspace) => {
			const config = createCapabilityConfig();

			const ir = await buildIr({
				config,
				sourcePath: path.join(workspace, 'wpk.config.ts'),
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			});

			const mapSource = ir.capabilityMap.sourcePath
				?.replace(/\\/g, '/')
				?.endsWith('src/capability-map.ts');
			expect(mapSource).toBe(true);

			const createDefinition = ir.capabilityMap.definitions.find(
				(entry) => entry.key === 'demo.create'
			);
			expect(createDefinition).toEqual({
				key: 'demo.create',
				capability: 'manage_options',
				appliesTo: 'resource',
				source: 'map',
			});

			const getDefinition = ir.capabilityMap.definitions.find(
				(entry) => entry.key === 'demo.get'
			);
			expect(getDefinition).toEqual({
				key: 'demo.get',
				capability: 'edit_post',
				appliesTo: 'object',
				binding: 'postId',
				source: 'map',
			});
		}
	);
});

it('propagates ts import errors as validation failures', async () => {
	setCachedTsImport(Promise.reject(new Error('ts import failed')));

	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'wpk.config.ts'),
				'export const wpkConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'capability-map.ts'),
				'// ts module placeholder',
				'utf8'
			);
		},
		async (workspace) => {
			const config = createCapabilityConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining(
					'Failed to load capability map'
				),
			});
		}
	);
});

it('rejects modules that do not export a capability map object', async () => {
	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'wpk.config.ts'),
				'export const wpkConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'capability-map.cjs'),
				['module.exports = {', '        capabilityMap: 42,', '};'].join(
					'\n'
				),
				'utf8'
			);
		},
		async (workspace) => {
			const config = createCapabilityConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining(
					'must export a capability map object'
				),
			});
		}
	);
});

it('rejects when a capability descriptor factory throws during evaluation', async () => {
	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'wpk.config.ts'),
				'export const wpkConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'capability-map.cjs'),
				[
					'module.exports = {',
					'        capabilityMap: {',
					"                'demo.create': 'manage_options',",
					"                'demo.get': () => { throw new Error('boom'); },",
					'        },',
					'};',
				].join('\n'),
				'utf8'
			);
		},
		async (workspace) => {
			const config = createCapabilityConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining('threw during evaluation'),
				context: expect.objectContaining({ capability: 'demo.get' }),
			});
		}
	);
});
