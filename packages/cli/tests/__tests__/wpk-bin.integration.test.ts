import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { runWpk } from '../test-support/runWpk';
import { withWorkspace } from '../workspace.test-support';

jest.setTimeout(30000);

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
							WPK_PHP_AUTOLOAD: path.join(
								workspace,
								'missing-autoload.php'
							),
							WPK_PHP_AUTOLOAD_PATHS: '',
							PHP_DRIVER_TRACE_FILE: path.join(
								workspace,
								'.wpk',
								'php-driver.trace.log'
							),
						},
					}
				);

				expect(generateResult.code).toBe(1);

				expect(generateResult.stderr).toContain(
					'Composer autoload not found'
				);

				const tracePath = path.join(
					workspace,
					'.wpk',
					'php-driver.trace.log'
				);
				const traceExists = await fs
					.access(tracePath)
					.then(() => true)
					.catch(() => false);

				if (traceExists) {
					const traceLog = await fs.readFile(tracePath, 'utf8');
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
				}

				await expect(
					fs.access(path.join(workspace, '.generated'))
				).rejects.toMatchObject({ code: 'ENOENT' });
			},
			{ chdir: false }
		);
	}, 300_000);

	it('manages the plugin loader through generate and apply', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'loader-plugin',
				]);

				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const gitInitResult = await runProcess('git', ['init'], {
					cwd: workspace,
				});
				expect(gitInitResult.code).toBe(0);

				const generateResult = await runWpk(workspace, ['generate']);
				expect(generateResult.code).toBe(0);

				const indexPath = path.join(
					workspace,
					'.generated',
					'php',
					'index.php'
				);
				const indexContents = await fs.readFile(indexPath, 'utf8');
				expect(indexContents).toContain(
					"require_once(dirname(__DIR__) . '/plugin.php');"
				);

				const planPath = path.join(
					workspace,
					'.wpk',
					'apply',
					'plan.json'
				);
				const plan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{ file: string }>;
				};
				expect(
					plan.instructions?.some(
						(instruction) => instruction.file === 'plugin.php'
					)
				).toBe(true);

				const applyResult = await runWpk(workspace, ['apply', '--yes']);
				expect(applyResult.code).toBe(0);

				const pluginPath = path.join(workspace, 'plugin.php');
				const pluginLoader = await fs.readFile(pluginPath, 'utf8');
				expect(pluginLoader).toContain('WPK:BEGIN AUTO');

				const customLoader = ['<?php', '// author override', ''].join(
					'\n'
				);
				await fs.writeFile(pluginPath, customLoader, 'utf8');

				const regenResult = await runWpk(workspace, ['generate']);
				expect(regenResult.code).toBe(0);

				const updatedPlan = JSON.parse(
					await fs.readFile(planPath, 'utf8')
				) as {
					instructions?: Array<{ file: string }>;
				};
				expect(
					updatedPlan.instructions?.some(
						(instruction) => instruction.file === 'plugin.php'
					)
				).toBe(false);

				const applyOverride = await runWpk(workspace, [
					'apply',
					'--yes',
				]);
				expect(applyOverride.code).toBe(0);

				const finalLoader = await fs.readFile(pluginPath, 'utf8');
				expect(finalLoader).toContain('// author override');
			},
			{ chdir: false }
		);
	}, 300_000);
});