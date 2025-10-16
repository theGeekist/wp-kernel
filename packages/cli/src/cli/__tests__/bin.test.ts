import path from 'node:path';
import { spawn } from 'node:child_process';

describe('wpk bin', () => {
	it('falls back to TypeScript sources when dist artifacts are unavailable', async () => {
		const binPath = path.join(__dirname, '../../../bin/wpk.js');
		const result = await runCli(binPath, ['--help'], {
			WPK_CLI_FORCE_SOURCE: '1',
		});

		expect(result.stdout).toContain('WP Kernel CLI entry point');
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
