import path from 'node:path';
import fs from 'node:fs/promises';
import type { KernelConfigV1 } from '../../config/types';
import { buildIr } from '../build-ir';
import { setCachedTsImport } from '../../config/load-kernel-config';
import { createBaseConfig, withTempWorkspace } from '../test-helpers';

describe('policy map integration', () => {
	afterEach(() => {
		setCachedTsImport(null);
	});

	it('falls back to defaults when policy map is missing', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				});

				expect(ir.policyMap.definitions).toHaveLength(0);
				expect(ir.policyMap.missing.sort()).toEqual([
					'demo.create',
					'demo.get',
				]);
				expect(ir.policyMap.unused).toHaveLength(0);
				expect(ir.policyMap.fallback).toEqual({
					capability: 'manage_options',
					appliesTo: 'resource',
				});
				expect(
					ir.policyMap.warnings.map((warning) => warning.code)
				).toContain('policy-map.missing');
			}
		);
	});

	it('warns when policy map omits referenced entries', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'policy-map.cjs'),
					[
						'module.exports = {',
						'        policyMap: {',
						"                'demo.create': 'manage_options',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				});

				expect(ir.policyMap.missing).toEqual(['demo.get']);
				expect(
					ir.policyMap.warnings.map((warning) => warning.code)
				).toContain('policy-map.entries.missing');
			}
		);
	});

	it('loads policy definitions from src/policy-map.ts', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'policy-map.cjs'),
					[
						'module.exports = {',
						'        policyMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'object' },",
						"                'unused.policy': 'read',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				});

				const definitionMap = new Map(
					ir.policyMap.definitions.map((entry) => [entry.key, entry])
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

				expect(ir.policyMap.missing).toHaveLength(0);
				expect(ir.policyMap.unused).toEqual(['unused.policy']);
				expect(
					ir.policyMap.warnings.map((warning) => warning.code)
				).toContain('policy-map.entries.unused');
				expect(ir.policyMap.sourcePath).toBeDefined();
				expect(
					ir.policyMap.sourcePath
						?.replace(/\\/g, '/')
						?.endsWith('src/policy-map.cjs')
				).toBe(true);
			}
		);
	});

	it('warns when bindings cannot be inferred for object-scoped policies', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'policy-map.cjs'),
					[
						'module.exports = {',
						'        policyMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'object' },",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();
				(config.resources as Record<string, unknown>).secondary = {
					name: 'secondary',
					schema: 'auto',
					identity: { type: 'number', param: 'postId' },
					routes: {
						get: {
							path: '/test/v1/secondary/:postId',
							method: 'GET',
							policy: 'demo.get',
						},
					},
				};

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				});

				const demoGet = ir.policyMap.definitions.find(
					(entry) => entry.key === 'demo.get'
				);
				expect(demoGet?.binding).toBeUndefined();
				expect(
					ir.policyMap.warnings.map((warning) => warning.code)
				).toContain('policy-map.binding.missing');
			}
		);
	});

	it('rejects policy map entries that resolve to unsupported values', async () => {
		await withTempWorkspace(
			async (workspace) => {
				await fs.writeFile(
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'policy-map.cjs'),
					[
						'module.exports = {',
						'        policyMap: {',
						"                'demo.create': () => 42,",
						"                'demo.get': async () => 'edit_post',",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();

				await expect(
					buildIr({
						config,
						sourcePath: path.join(workspace, 'kernel.config.ts'),
						origin: 'kernel.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					code: 'ValidationError',
					context: expect.objectContaining({ policy: 'demo.create' }),
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
					path.join(workspace, 'kernel.config.ts'),
					'export const kernelConfig = {};',
					'utf8'
				);
				await fs.mkdir(path.join(workspace, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspace, 'src', 'policy-map.cjs'),
					[
						'module.exports = {',
						'        policyMap: {',
						"                'demo.create': 'manage_options',",
						"                'demo.get': { capability: 'edit_post', appliesTo: 'objectt' },",
						'        },',
						'};',
					].join('\n'),
					'utf8'
				);
			},
			async (workspace) => {
				const config = createPolicyConfig();

				await expect(
					buildIr({
						config,
						sourcePath: path.join(workspace, 'kernel.config.ts'),
						origin: 'kernel.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					code: 'ValidationError',
					context: expect.objectContaining({ policy: 'demo.get' }),
					message: expect.stringContaining('invalid appliesTo scope'),
				});
			}
		);
	});
});

function createPolicyConfig(): KernelConfigV1 {
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
					policy: 'demo.create',
				},
				get: {
					path: '/test/v1/demo/:id',
					method: 'GET',
					policy: 'demo.get',
				},
			},
		},
	} as unknown as KernelConfigV1['resources'];

	return config;
}
it('resolves ts-based policy maps with async descriptors', async () => {
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
				path.join(workspace, 'kernel.config.ts'),
				'export const kernelConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'policy-map.ts'),
				'// module handled via injected tsImport',
				'utf8'
			);
		},
		async (workspace) => {
			const config = createPolicyConfig();

			const ir = await buildIr({
				config,
				sourcePath: path.join(workspace, 'kernel.config.ts'),
				origin: 'kernel.config.ts',
				namespace: config.namespace,
			});

			const mapSource = ir.policyMap.sourcePath
				?.replace(/\\/g, '/')
				?.endsWith('src/policy-map.ts');
			expect(mapSource).toBe(true);

			const createDefinition = ir.policyMap.definitions.find(
				(entry) => entry.key === 'demo.create'
			);
			expect(createDefinition).toEqual({
				key: 'demo.create',
				capability: 'manage_options',
				appliesTo: 'resource',
				source: 'map',
			});

			const getDefinition = ir.policyMap.definitions.find(
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
				path.join(workspace, 'kernel.config.ts'),
				'export const kernelConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'policy-map.ts'),
				'// ts module placeholder',
				'utf8'
			);
		},
		async (workspace) => {
			const config = createPolicyConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining('Failed to load policy map'),
			});
		}
	);
});

it('rejects modules that do not export a policy map object', async () => {
	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'export const kernelConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'policy-map.cjs'),
				['module.exports = {', '        policyMap: 42,', '};'].join(
					'\n'
				),
				'utf8'
			);
		},
		async (workspace) => {
			const config = createPolicyConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining(
					'must export a policy map object'
				),
			});
		}
	);
});

it('rejects when a policy descriptor factory throws during evaluation', async () => {
	await withTempWorkspace(
		async (workspace) => {
			await fs.writeFile(
				path.join(workspace, 'kernel.config.ts'),
				'export const kernelConfig = {};',
				'utf8'
			);
			await fs.mkdir(path.join(workspace, 'src'), {
				recursive: true,
			});
			await fs.writeFile(
				path.join(workspace, 'src', 'policy-map.cjs'),
				[
					'module.exports = {',
					'        policyMap: {',
					"                'demo.create': 'manage_options',",
					"                'demo.get': () => { throw new Error('boom'); },",
					'        },',
					'};',
				].join('\n'),
				'utf8'
			);
		},
		async (workspace) => {
			const config = createPolicyConfig();

			await expect(
				buildIr({
					config,
					sourcePath: path.join(workspace, 'kernel.config.ts'),
					origin: 'kernel.config.ts',
					namespace: config.namespace,
				})
			).rejects.toMatchObject({
				code: 'ValidationError',
				message: expect.stringContaining('threw during evaluation'),
				context: expect.objectContaining({ policy: 'demo.get' }),
			});
		}
	);
});
