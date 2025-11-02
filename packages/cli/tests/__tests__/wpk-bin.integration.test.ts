import fs from 'node:fs/promises';
import path from 'node:path';
import { runWpk } from '../test-support/runWpk';
import { withWorkspace } from '../workspace.test-support';

const PHP_JSON_AST_AUTOLOAD = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'php-json-ast',
	'vendor',
	'autoload.php'
);

jest.setTimeout(30000);

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
					'nikic/php-parser not found via autoload'
				);
				expect(generateResult.stderr).toContain(
					'Run `composer install` in your plugin, or set WPK_PHP_AUTOLOAD.'
				);

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

	it('links the generated PHP index to the plugin loader at the plugin root', async () => {
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
							WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
							PHP_DRIVER_TRACE_FILE: path.join(
								workspace,
								'.wpk',
								'php-driver.trace.log'
							),
						},
					}
				);

				expect(generateResult.code).not.toBe(0);

				const phpIndexPath = path.join(
					workspace,
					'.generated',
					'php',
					'index.php'
				);
				const phpIndexSource = await fs.readFile(phpIndexPath, 'utf8');

				if (phpIndexSource.includes('require_once')) {
					expect(phpIndexSource).toContain(
						"dirname(__DIR__, 2) . '/plugin.php'"
					);
				}
			},
			{ chdir: false }
		);
	}, 300_000);
});
