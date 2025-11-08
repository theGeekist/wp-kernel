import path from 'node:path';
import fs from 'node:fs/promises';
import type { ResourceCapabilityMap } from '@wpkernel/core/resource';
import type { WPKernelConfigV1 } from '../../config/types';
import { buildIr } from '../buildIr';
import { setCachedTsImport } from '../../config/load-wpk-config';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';

// Helper to add capabilities to a resource config in a type-safe way
function addCapabilities(
	config: WPKernelConfigV1,
	resourceName: string,
	capabilities: ResourceCapabilityMap
): void {
	const resource = config.resources[resourceName];
	if (resource && typeof resource === 'object') {
		(resource as Record<string, unknown>).capabilities = capabilities;
	}
}

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
			},
			async (workspace) => {
				const config = createCapabilityConfig();
				// Add inline capabilities but omit 'demo.get'
				addCapabilities(config, 'demo', {
					'demo.create': 'manage_options',
				});

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

	it('loads capability definitions from inline config', async () => {
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
				// Add inline capabilities
				addCapabilities(config, 'demo', {
					'demo.create': 'manage_options',
					'demo.get': {
						capability: 'edit_post',
						appliesTo: 'object',
					},
					'unused.capability': 'read',
				});

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

				const createDefinition = definitionMap.get('demo.create');
				expect(createDefinition).toMatchObject({
					key: 'demo.create',
					capability: 'manage_options',
					appliesTo: 'resource',
					source: 'map',
				});
				expect(createDefinition?.id).toEqual(
					expect.stringMatching(/^cap:/)
				);
				expect(createDefinition?.binding).toBeUndefined();

				const getDefinition = definitionMap.get('demo.get');
				expect(getDefinition).toMatchObject({
					key: 'demo.get',
					capability: 'edit_post',
					appliesTo: 'object',
					binding: 'id',
					source: 'map',
				});
				expect(getDefinition?.id).toEqual(
					expect.stringMatching(/^cap:/)
				);

				expect(ir.capabilityMap.missing).toHaveLength(0);
				expect(ir.capabilityMap.unused).toEqual(['unused.capability']);
				expect(
					ir.capabilityMap.warnings.map((warning) => warning.code)
				).toContain('capability-map.entries.unused');
				expect(ir.capabilityMap.sourcePath).toBe('inline');
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
			},
			async (workspace) => {
				const config = createCapabilityConfig();
				// Add inline capabilities
				addCapabilities(config, 'demo', {
					'demo.create': 'manage_options',
					'demo.get': {
						capability: 'edit_post',
						appliesTo: 'object',
					},
				});
				// Add second resource with different identity param
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

	// Remove tests that were specific to file loading and error handling since we no longer load files
	// These tests: 'rejects capability map entries that resolve to unsupported values',
	// 'rejects descriptors with invalid appliesTo scope', 'rejects when capability map module',
	// 'rejects when a capability descriptor factory throws during evaluation'
	// are no longer relevant as we don't load external files

	it('uses inline capability maps from resource config', async () => {
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
				// Add inline capabilities to the resource
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'demo.get': 'read',
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.capabilityMap.definitions).toHaveLength(2);
				expect(ir.capabilityMap.missing).toHaveLength(0);
				expect(ir.capabilityMap.sourcePath).toBe('inline');

				const definitionMap = new Map(
					ir.capabilityMap.definitions.map((entry) => [
						entry.key,
						entry,
					])
				);

				expect(definitionMap.get('demo.create')).toMatchObject({
					key: 'demo.create',
					capability: 'edit_posts',
					appliesTo: 'resource',
					source: 'map',
				});
				expect(definitionMap.get('demo.get')).toMatchObject({
					key: 'demo.get',
					capability: 'read',
					appliesTo: 'resource',
					source: 'map',
				});
			}
		);
	});

	it('collects capabilities from multiple resources', async () => {
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

				// Add capabilities to first resource
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'demo.get': 'read',
				});

				// Add a second resource with its own capabilities
				(config.resources as Record<string, unknown>).books = {
					name: 'books',
					schema: 'auto',
					identity: { type: 'number', param: 'bookId' },
					routes: {
						create: {
							path: '/test/v1/books',
							method: 'POST',
							capability: 'book.create',
						},
					},
				};
				addCapabilities(config, 'books', {
					'book.create': 'publish_posts',
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.capabilityMap.definitions).toHaveLength(3);
				expect(ir.capabilityMap.missing).toHaveLength(0);

				const definitionMap = new Map(
					ir.capabilityMap.definitions.map((entry) => [
						entry.key,
						entry,
					])
				);

				expect(definitionMap.get('demo.create')).toMatchObject({
					capability: 'edit_posts',
				});
				expect(definitionMap.get('book.create')).toMatchObject({
					capability: 'publish_posts',
				});
			}
		);
	});

	it('validates appliesTo scope and rejects invalid values', async () => {
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
				// Add capability with invalid appliesTo scope
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'demo.get': {
						capability: 'read',
						appliesTo: 'invalid-scope' as 'object',
					},
				});

				await expect(
					buildIr({
						config,
						sourcePath: path.join(workspace, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					code: 'ValidationError',
					message: expect.stringContaining('invalid appliesTo scope'),
					context: expect.objectContaining({
						capability: 'demo.get',
					}),
				});
			}
		);
	});

	it('normalizes binding strings by trimming whitespace', async () => {
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
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'demo.get': {
						capability: 'read',
						appliesTo: 'object',
						binding: '  postId  ',
					},
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				const demoGet = ir.capabilityMap.definitions.find(
					(entry) => entry.key === 'demo.get'
				);
				expect(demoGet?.binding).toBe('postId');
			}
		);
	});

	it('handles empty capabilities object', async () => {
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
				// Add empty capabilities object
				addCapabilities(config, 'demo', {});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				// Should fall back since no capabilities defined
				expect(ir.capabilityMap.definitions).toHaveLength(0);
				expect(ir.capabilityMap.missing.sort()).toEqual([
					'demo.create',
					'demo.get',
				]);
				expect(ir.capabilityMap.sourcePath).toBeUndefined();
			}
		);
	});

	it('rejects non-string and non-descriptor capability values', async () => {
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
				// Add invalid capability value (number instead of string/descriptor)
				addCapabilities(config, 'demo', {
					'demo.create': 42 as unknown as string,
				});

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
						'must resolve to a capability string or descriptor'
					),
					context: expect.objectContaining({
						capability: 'demo.create',
					}),
				});
			}
		);
	});

	it('returns null binding when multiple identity params are ambiguous', async () => {
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

				// Add a second resource with different identity param
				(config.resources as Record<string, unknown>).books = {
					name: 'books',
					schema: 'auto',
					identity: { type: 'number', param: 'bookId' },
					routes: {
						get: {
							path: '/test/v1/books/:bookId',
							method: 'GET',
							capability: 'shared.get',
						},
					},
				};

				// Update demo resource to also use shared capability
				(config.resources as Record<string, unknown>).demo = {
					name: 'demo',
					schema: 'auto',
					identity: { type: 'number', param: 'postId' },
					routes: {
						create: {
							path: '/test/v1/demo',
							method: 'POST',
							capability: 'demo.create',
						},
						get: {
							path: '/test/v1/demo/:postId',
							method: 'GET',
							capability: 'shared.get',
						},
					},
				};

				// Add capability that references both resources (ambiguous)
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'shared.get': {
						capability: 'read',
						appliesTo: 'object',
						// No binding specified, should be ambiguous due to two different params
					},
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				const sharedGet = ir.capabilityMap.definitions.find(
					(entry) => entry.key === 'shared.get'
				);
				// The binding derivation returns null when bindings.size > 1 (line 306)
				// which then gets converted to undefined by line 152 (binding ?? undefined)
				expect(sharedGet).toBeDefined();
				expect(sharedGet?.appliesTo).toBe('object');
				expect(sharedGet?.binding).toBeUndefined();
			}
		);
	});

	it('returns null binding when object-scoped capability has no hints', async () => {
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

				// Add capability with appliesTo: 'object' but it's not referenced by any route
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'demo.get': 'read',
					'unused.capability': {
						capability: 'custom_cap',
						appliesTo: 'object',
						// No routes reference this, so no hints will exist
					},
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				const unusedCap = ir.capabilityMap.definitions.find(
					(entry) => entry.key === 'unused.capability'
				);
				// Should have appliesTo: 'object' but no binding (no hints)
				expect(unusedCap).toBeDefined();
				expect(unusedCap?.appliesTo).toBe('object');
				expect(unusedCap?.binding).toBeUndefined();
			}
		);
	});

	it('rejects conflicting capability definitions across resources', async () => {
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

				// Add a second resource that defines the same capability with different value
				(config.resources as Record<string, unknown>).books = {
					name: 'books',
					schema: 'auto',
					identity: { type: 'number', param: 'bookId' },
					routes: {
						create: {
							path: '/test/v1/books',
							method: 'POST',
							capability: 'demo.create', // Same as demo resource
						},
					},
				};

				// Define different values for the same capability
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
				});
				addCapabilities(config, 'books', {
					'demo.create': 'publish_posts', // Conflict!
				});

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
						"Conflicting capability map entry 'demo.create'"
					),
					context: expect.objectContaining({
						capability: 'demo.create',
						firstResource: 'demo',
						secondResource: 'books',
					}),
				});
			}
		);
	});

	it('allows same capability definition across resources if values match', async () => {
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

				// Add a second resource with same capability value
				(config.resources as Record<string, unknown>).books = {
					name: 'books',
					schema: 'auto',
					identity: { type: 'number', param: 'bookId' },
					routes: {
						create: {
							path: '/test/v1/books',
							method: 'POST',
							capability: 'shared.create',
						},
					},
				};

				// Define same value for the same capability in both resources
				addCapabilities(config, 'demo', {
					'demo.create': 'edit_posts',
					'shared.create': 'edit_posts',
				});
				addCapabilities(config, 'books', {
					'shared.create': 'edit_posts', // Same value - OK!
				});

				const ir = await buildIr({
					config,
					sourcePath: path.join(workspace, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				// Should succeed with no errors
				expect(ir.capabilityMap.definitions).toBeDefined();
				const sharedCreate = ir.capabilityMap.definitions.find(
					(def) => def.key === 'shared.create'
				);
				expect(sharedCreate?.capability).toBe('edit_posts');
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
