import path from 'node:path';
import fs from 'node:fs/promises';
import type { KernelConfigV1 } from '../../config/types';
import { buildIr } from '../build-ir';
import { createBaseConfig, withTempWorkspace } from '../test-helpers';

describe('policy map integration', () => {
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
