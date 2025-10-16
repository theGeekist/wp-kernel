import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
	withIsolatedWorkspace,
	writeWorkspaceFiles,
} from '../test-support/isolated-workspace.test-support.js';
import { runNodeSnippet } from '../test-support/cli-runner.test-support.js';

describe('@wpkernel/e2e-utils test-support helpers', () => {
	it('disposes isolated workspaces automatically', async () => {
		const marker = await withIsolatedWorkspace(async (workspace) => {
			await writeWorkspaceFiles(workspace, {
				'src/index.ts': 'export const value = 1;\n',
			});

			const created = await fs.readFile(
				path.join(workspace.root, 'src/index.ts'),
				'utf8'
			);

			expect(created).toContain('value = 1');
			return workspace.root;
		});

		await expect(fs.stat(marker)).rejects.toMatchObject({ code: 'ENOENT' });
	});

	it('captures node snippet output and metadata', async () => {
		const transcript = await runNodeSnippet({
			script: "console.log('snippet output')",
		});

		expect(transcript.stdout).toContain('snippet output');
		expect(transcript.command).toBe(process.execPath);
	});
});
