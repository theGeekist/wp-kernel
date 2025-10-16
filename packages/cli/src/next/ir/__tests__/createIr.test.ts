import path from 'node:path';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { KernelConfigV1 } from '../../../config/types';
import { buildIr } from '../../../ir';
import { FIXTURE_CONFIG_PATH, FIXTURE_ROOT } from '../../../ir/test-helpers';
import { createWorkspace } from '../../workspace';
import { createIr } from '../createIr';

describe('createIr', () => {
	it('reproduces the legacy IR output for a basic configuration', async () => {
		const schemaPath = path.relative(
			path.dirname(FIXTURE_CONFIG_PATH),
			path.join(FIXTURE_ROOT, 'schemas', 'todo.schema.json')
		);

		const config: KernelConfigV1 = {
			version: 1,
			namespace: 'todo-app',
			schemas: {
				todo: {
					path: schemaPath,
					generated: {
						types: './generated/todo.ts',
					},
				},
			},
			resources: {
				todo: {
					name: 'todo',
					schema: 'todo',
					routes: {
						list: {
							path: '/todo-app/v1/todo',
							method: 'GET',
							policy: 'manage_todo',
						},
					},
					cacheKeys: {
						list: () => ['todo', 'list'],
						get: (id: string | number) => ['todo', 'get', id],
					},
				},
			},
		} as KernelConfigV1;

		const options = {
			config,
			namespace: config.namespace,
			origin: 'typescript',
			sourcePath: FIXTURE_CONFIG_PATH,
		} as const;

		const workspace = createWorkspace(path.dirname(FIXTURE_CONFIG_PATH));
		const [legacy, next] = await Promise.all([
			buildIr(options),
			createIr(options, {
				workspace,
				reporter: createNoopReporter(),
			}),
		]);

		expect(next).toEqual(legacy);
	});
});
