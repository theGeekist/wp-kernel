import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createIsolatedWorkspace } from '../integration/workspace.js';

describe('createIsolatedWorkspace', () => {
	it('creates a disposable workspace and runs commands', async () => {
		const workspace = await createIsolatedWorkspace({
			timezone: 'UTC',
			locale: 'en_US.UTF-8',
		});

		await fs.access(workspace.root);

		const transcript = await workspace.run(workspace.tools.node, [
			'-e',
			"console.log('workspace run');",
		]);

		expect(transcript.exitCode).toBe(0);
		expect(transcript.stdout).toContain('workspace run');
		expect(transcript.env.TZ).toBe('UTC');
		expect(transcript.env.LANG).toBe('en_US.UTF-8');

		await workspace.dispose();

		await expect(fs.access(workspace.root)).rejects.toThrow();
	});

	it('supports per-command overrides', async () => {
		const workspace = await createIsolatedWorkspace();
		const transcript = await workspace.run(
			workspace.tools.node,
			['-e', "process.stdout.write(process.env.CUSTOM_ENV ?? '');"],
			{
				env: { CUSTOM_ENV: 'custom-value' },
			}
		);

		expect(transcript.stdout).toBe('custom-value');

		await workspace.dispose();
	});

	it('runs commands from custom cwd', async () => {
		const workspace = await createIsolatedWorkspace();
		const nestedDir = path.join(workspace.root, 'nested');
		await fs.mkdir(nestedDir, { recursive: true });
		const transcript = await workspace.run(
			workspace.tools.node,
			[
				'-e',
				"process.stdout.write(require('node:path').basename(process.cwd()));",
			],
			{
				cwd: nestedDir,
			}
		);

		expect(transcript.stdout).toBe('nested');

		await workspace.dispose();
	});

	it('exposes tool overrides', async () => {
		const workspace = await createIsolatedWorkspace({
			tools: { pnpm: 'custom-pnpm' },
		});

		expect(workspace.tools.pnpm).toBe('custom-pnpm');

		await workspace.dispose();
	});
});
