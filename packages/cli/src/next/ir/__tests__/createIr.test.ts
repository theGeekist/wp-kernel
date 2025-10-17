import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { KernelConfigV1 } from '../../../config/types';
import { buildIr } from '../../../ir';
import { FIXTURE_CONFIG_PATH, FIXTURE_ROOT } from '../../../ir/test-helpers';
import { createWorkspace } from '../../workspace';
import { createIr } from '../createIr';

const execFileAsync = promisify(execFile);

jest.setTimeout(60000);

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

		const workspaceRoot = await fs.mkdtemp(
			path.join(os.tmpdir(), 'php-ir-workspace-')
		);

		try {
			await fs.cp(FIXTURE_ROOT, workspaceRoot, { recursive: true });
			const composerTemplate = await fs.readFile(
				path.resolve(__dirname, '../../../../composer.json'),
				'utf8'
			);
			await fs.writeFile(
				path.join(workspaceRoot, 'composer.json'),
				composerTemplate
			);
			await execFileAsync(
				'composer',
				['install', '--no-interaction', '--no-progress'],
				{ cwd: workspaceRoot }
			);

			const copiedConfigPath = path.join(
				workspaceRoot,
				path.basename(FIXTURE_CONFIG_PATH)
			);

			const options = {
				config,
				namespace: config.namespace,
				origin: 'typescript',
				sourcePath: copiedConfigPath,
			} as const;

			const workspace = createWorkspace(workspaceRoot);
			const [legacy, next] = await Promise.all([
				buildIr(options),
				createIr(options, {
					workspace,
					reporter: createNoopReporter(),
				}),
			]);

			expect(next).toEqual(legacy);
		} finally {
			await fs.rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});
