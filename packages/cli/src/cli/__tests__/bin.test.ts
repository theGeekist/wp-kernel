import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { mkdtemp, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

jest.setTimeout(20000);

describe('wpk bin', () => {
	const hasDistArtifacts = () =>
		existsSync(path.join(__dirname, '../../../dist/cli/run.js'));

	(hasDistArtifacts() ? it : it.skip)(
		'runs from the compiled dist bundle when artifacts are present',
		async () => {
			const binPath = path.join(__dirname, '../../../bin/wpk.js');
			const result = await runCli(binPath, ['--help']);

			expect(result.stdout).toContain(
				'Unified CLI for scaffolding, generating, applying, and validating WPKernel projects.'
			);
		}
	);

	it('instructs developers to build when dist artifacts are unavailable', async () => {
		const binPath = path.join(__dirname, '../../../bin/wpk.js');
		const distDir = path.join(__dirname, '../../../dist');
		const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'wpk-cli-dist-'));
		const backupDist = path.join(tmpRoot, 'dist-backup');

		let restored = false;

		try {
			await rename(distDir, backupDist);
			restored = true;
		} catch (error) {
			if (
				!(
					error &&
					typeof error === 'object' &&
					'code' in error &&
					error.code === 'ENOENT'
				)
			) {
				throw error;
			}
		}

		try {
			await expect(runCli(binPath, ['--help'])).rejects.toThrow(
				/missing compiled CLI artifacts/i
			);
		} finally {
			if (restored) {
				await rename(backupDist, distDir);
			}

			await rm(tmpRoot, { recursive: true, force: true }).catch(
				() => undefined
			);
		}
	});
});

type EnvironmentOverrides = Record<string, string | undefined>;

function runCli(
	scriptPath: string,
	argv: string[],
	env: EnvironmentOverrides = {}
): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [scriptPath, ...argv], {
			cwd: path.join(__dirname, '../../..'),
			env: {
				...process.env,
				...env,
			},
			stdio: ['ignore', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr?.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.once('error', (error) => {
			reject(error);
		});

		child.once('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				reject(new Error(stderr || `wpk exited with code ${code}`));
			}
		});
	});
}
