import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
	CliTranscript,
	WorkspaceRunOptions,
} from '../integration/types.js';
import { withIsolatedWorkspace } from '../test-support/isolated-workspace.test-support.js';

interface FailureScenario {
	readonly name: string;
	readonly command: string;
	readonly args?: string[];
	readonly options?: WorkspaceRunOptions;
	readonly assert: (
		transcript: Pick<
			CliTranscript,
			'exitCode' | 'stderr' | 'stdout' | 'command' | 'args' | 'durationMs'
		>
	) => void;
}

describe('createIsolatedWorkspace', () => {
	it('creates a disposable workspace and runs commands', async () => {
		let disposedRoot = '';

		await withIsolatedWorkspace(
			{ timezone: 'UTC', locale: 'en_US.UTF-8' },
			async (workspace) => {
				disposedRoot = workspace.root;

				await fs.access(workspace.root);

				const transcript = await workspace.run(workspace.tools.node, [
					'-e',
					"console.log('workspace run');",
				]);

				expect(transcript.exitCode).toBe(0);
				expect(transcript.stdout).toContain('workspace run');
				expect(transcript.env.TZ).toBe('UTC');
				expect(transcript.env.LANG).toBe('en_US.UTF-8');
			}
		);

		await expect(fs.access(disposedRoot)).rejects.toThrow();
	});

	it('supports per-command overrides', async () => {
		await withIsolatedWorkspace(async (workspace) => {
			const transcript = await workspace.run(
				workspace.tools.node,
				['-e', "process.stdout.write(process.env.CUSTOM_ENV ?? '');"],
				{
					env: { CUSTOM_ENV: 'custom-value' },
				}
			);

			expect(transcript.stdout).toBe('custom-value');
		});
	});

	it('runs commands from custom cwd', async () => {
		await withIsolatedWorkspace(async (workspace) => {
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
		});
	});

	it('exposes tool overrides', async () => {
		await withIsolatedWorkspace(
			{ tools: { pnpm: 'custom-pnpm' } },
			async (workspace) => {
				expect(workspace.tools.pnpm).toBe('custom-pnpm');
			}
		);
	});

	describe('failure diagnostics', () => {
		const scenarios: FailureScenario[] = [
			{
				name: 'non-zero exit codes bubble up stderr output',
				command: process.execPath,
				args: [
					'-e',
					[
						"console.error('workspace failure');",
						'process.exit(2);',
					].join('\n'),
				],
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(2);
					expect(transcript.stderr).toContain('workspace failure');
					expect(transcript.command).toBe(process.execPath);
					expect(transcript.args).toEqual([
						'-e',
						[
							"console.error('workspace failure');",
							'process.exit(2);',
						].join('\n'),
					]);
				},
			},
			{
				name: 'spawn errors include actionable diagnostics',
				command: 'nonexistent-workspace-command',
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(-1);
					expect(transcript.stderr).toContain(
						'Failed to spawn command "nonexistent-workspace-command"'
					);
					expect(transcript.stderr).toMatch(/ENOENT/);
				},
			},
			{
				name: 'timeouts terminate hung processes',
				command: process.execPath,
				args: ['-e', 'setTimeout(() => {}, 200);'],
				options: { timeoutMs: 50 },
				assert: (transcript) => {
					expect(transcript.exitCode).toBe(-1);
					expect(transcript.stderr).toBe('');
					expect(transcript.durationMs).toBeLessThan(200);
				},
			},
		];

		it.each(scenarios)('handles %s', async (scenario) => {
			await withIsolatedWorkspace(async (workspace) => {
				const transcript = await workspace.run(
					scenario.command,
					scenario.args,
					scenario.options
				);

				scenario.assert(transcript);
			});
		});
	});
});
