import fs from 'node:fs/promises';
import path from 'node:path';
import { withWorkspace } from '../workspace.test-support';

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
