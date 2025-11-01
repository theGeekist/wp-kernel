import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
	buildPhpIntegrationEnv,
	withWorkspace,
} from '../workspace.test-support';

jest.setTimeout(30000);

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

type RunWpkOptions = {
	env?: NodeJS.ProcessEnv;
};

function runWpk(
	workspace: string,
	args: string[],
	options: RunWpkOptions = {}
): Promise<RunResult> {
	const env = buildPhpIntegrationEnv({
		...process.env,
		...options.env,
		NODE_ENV: 'test',
		FORCE_COLOR: '0',
	});

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
				const scaffoldedMessage =
					'created plugin scaffold for integration-plugin';
				expect(result.stdout).toContain(scaffoldedMessage);
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

				const indexPath = path.join(workspace, 'src', 'index.ts');
				const indexSource = await fs.readFile(indexPath, 'utf8');
				expect(indexSource).toContain('bootstrapKernel');
			},
			{ chdir: false }
		);
	});

	it('generates PHP artifacts via generate', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'integration-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const generateResult = await runWpk(
					workspace,
					['generate', '--verbose'],
					{
						env: {
							PHP_DRIVER_AUTOLOAD_PATHS: '',
							PHP_DRIVER_TRACE_FILE: path.join(
								workspace,
								'.wpk',
								'php-driver.trace.log'
							),
						},
					}
				);

				expect(generateResult.code).toBe(1);

				const traceLog = await fs.readFile(
					path.join(workspace, '.wpk', 'php-driver.trace.log'),
					'utf8'
				);
				const traceEvents = traceLog
					.split(/\r?\n/u)
					.map((line) => line.trim())
					.filter(Boolean)
					.map(
						(line) =>
							JSON.parse(line) as {
								event?: string;
							}
					);
				expect(
					traceEvents.some((entry) => entry.event === 'boot')
				).toBe(true);
				expect(
					traceEvents.some((entry) => entry.event === 'failure')
				).toBe(true);
				expect(
					traceEvents.some((entry) => entry.event === 'success')
				).toBe(false);

				await expect(
					fs.access(path.join(workspace, '.generated'))
				).rejects.toMatchObject({ code: 'ENOENT' });
			},
			{ chdir: false }
		);
	}, 300_000);
});
