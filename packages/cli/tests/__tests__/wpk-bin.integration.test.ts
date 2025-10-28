import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { withWorkspace } from '../workspace.test-support';

const CLI_BIN = path.resolve(__dirname, '../../bin/wpk.js');
const CLI_LOADER = path.resolve(
	__dirname,
	'../test-support/wpk-cli-loader.mjs'
);

type RunResult = {
	code: number;
	stdout: string;
	stderr: string;
};

type RunOptions = {
	cwd: string;
	env?: NodeJS.ProcessEnv;
};

function runProcess(
	command: string,
	args: string[],
	options: RunOptions
): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env,
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

		child.once('error', reject);
		child.once('close', (code) => {
			resolve({
				code: code ?? 0,
				stdout,
				stderr,
			});
		});
	});
}

function runWpk(workspace: string, args: string[]): Promise<RunResult> {
	const env: NodeJS.ProcessEnv = {
		...process.env,
		NODE_ENV: 'test',
		FORCE_COLOR: '0',
	};

	const existingNodeOptions = env.NODE_OPTIONS ?? '';
	const segments = [];
	if (existingNodeOptions.length > 0) {
		segments.push(existingNodeOptions);
	}
	segments.push('--no-warnings');
	segments.push(`--loader ${CLI_LOADER}`);
	env.NODE_OPTIONS = segments.join(' ');

	return runProcess(process.execPath, [CLI_BIN, ...args], {
		cwd: workspace,
		env,
	});
}

describe('wpk bin integration', () => {
	it('scaffolds a plugin workspace via init', async () => {
		await withWorkspace(
			async (workspace) => {
				const result = await runWpk(workspace, [
					'init',
					'--name',
					'integration-plugin',
				]);

				expect(result.code).toBe(0);
				expect(result.stderr).toBe('');
				expect(result.stdout).toContain(
					'created plugin scaffold for integration-plugin'
				);
				expect(result.stdout).toContain('created wpk.config.ts');

				const configPath = path.join(workspace, 'wpk.config.ts');
				const configSource = await fs.readFile(configPath, 'utf8');
				expect(configSource).toContain(
					"namespace: 'integration-plugin'"
				);

				const packageJsonPath = path.join(workspace, 'package.json');
				const packageJson = JSON.parse(
					await fs.readFile(packageJsonPath, 'utf8')
				);
				expect(packageJson).toMatchObject({
					name: 'integration-plugin',
					private: true,
					type: 'module',
					scripts: {
						start: 'wpk start',
						build: 'wpk build',
						generate: 'wpk generate',
						apply: 'wpk apply',
					},
				});

				const composerJsonPath = path.join(workspace, 'composer.json');
				const composerJson = JSON.parse(
					await fs.readFile(composerJsonPath, 'utf8')
				);
				expect(composerJson).toMatchObject({
					name: 'integration-plugin/integration-plugin',
				});
				expect(composerJson.autoload?.['psr-4']).toEqual({
					'IntegrationPlugin\\': 'inc/',
				});

				const indexSource = await fs.readFile(
					path.join(workspace, 'src', 'index.ts'),
					'utf8'
				);
				expect(indexSource).toContain('bootstrapKernel');
			},
			{ chdir: false }
		);
	});
});
