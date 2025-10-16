import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
	createWorkspaceRunner,
	withWorkspace,
} from '../workspace.test-support';

describe('withWorkspace', () => {
	it('creates and tears down a temporary workspace', async () => {
		let visited = '';

		await withWorkspace(
			async (workspace) => {
				visited = workspace;
				const exists = await fs.stat(workspace);
				expect(exists.isDirectory()).toBe(true);
			},
			{ chdir: false }
		);

		await expect(fs.access(visited)).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	it('writes provided files before running callback', async () => {
		await withWorkspace(
			async (workspace) => {
				const contents = await fs.readFile(
					path.join(workspace, 'foo/bar.txt'),
					'utf8'
				);
				expect(contents).toBe('hello');
			},
			{ chdir: false, files: { 'foo/bar.txt': 'hello' } }
		);
	});

	it('runs setup and teardown hooks', async () => {
		const visited: string[] = [];

		await withWorkspace(
			async () => {
				visited.push('run');
			},
			{
				chdir: false,
				setup: async (workspace) => {
					visited.push(`setup:${path.basename(workspace)}`);
				},
				teardown: async (workspace) => {
					visited.push(`teardown:${path.basename(workspace)}`);
				},
			}
		);

		expect(visited[0]).toMatch(/^setup:/);
		expect(visited[1]).toBe('run');
		expect(visited[2]).toMatch(/^teardown:/);
	});
});

describe('createWorkspaceRunner', () => {
	it('applies default options and merges overrides', async () => {
		const runWithWorkspace = createWorkspaceRunner({
			chdir: false,
			files: { 'defaults.txt': 'default' },
		});

		await runWithWorkspace(
			async (workspace) => {
				const defaultContents = await fs.readFile(
					path.join(workspace, 'defaults.txt'),
					'utf8'
				);
				const overrideContents = await fs.readFile(
					path.join(workspace, 'overrides.txt'),
					'utf8'
				);

				expect(defaultContents).toBe('default');
				expect(overrideContents).toBe('override');
			},
			{ files: { 'overrides.txt': 'override' } }
		);
	});

	it('respects the provided prefix', async () => {
		const prefix = path.join(os.tmpdir(), 'workspace-runner-');
		const runWithWorkspace = createWorkspaceRunner({
			chdir: false,
			prefix,
		});

		await runWithWorkspace(async (workspace) => {
			expect(
				path.basename(workspace).startsWith('workspace-runner-')
			).toBe(true);
			expect(path.dirname(workspace)).toBe(path.dirname(prefix));
		});
	});
});
