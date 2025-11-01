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

jest.setTimeout(300000);

describe('generate + apply integration', () => {
	it('captures current PHP driver behaviour for generate/apply', async () => {
		await withWorkspace(
			async (workspace) => {
				const initResult = await runWpk(workspace, [
					'init',
					'--name',
					'generate-apply-plugin',
				]);
				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const traceFile = path.join(
					workspace,
					'.wpk',
					'php-driver.trace.log'
				);
				const generateResult = await runWpk(
					workspace,
					['generate', '--verbose'],
					{
						env: {
							WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
							PHP_DRIVER_TRACE_FILE: traceFile,
						},
					}
				);

				expect(generateResult.code).toBe(1);
				expect(generateResult.stdout).toBe('');
				expect(generateResult.stderr).toContain(
					'[wpk.php-driver][stderr]'
				);
				expect(generateResult.stderr).toContain(
					'[wpk.php-driver][stdout]'
				);
				expect(generateResult.stderr).toContain(
					'Deprecated: Creation of dynamic property PhpParser'
				);
				expect(generateResult.stderr).toContain(
					'Fatal error: Uncaught Error: Typed property PhpParser'
				);

				const traceContents = await fs.readFile(traceFile, 'utf8');
				const traceEvents = traceContents
					.split(/\r?\n/u)
					.map((line) => line.trim())
					.filter(Boolean)
					.map(
						(line) =>
							JSON.parse(line) as {
								event?: string;
							}
					);
				const eventNames = traceEvents.map((entry) => entry.event);
				expect(eventNames).toContain('boot');
				expect(eventNames).toContain('start');
				expect(eventNames).not.toContain('success');
				expect(eventNames).not.toContain('failure');

				await expect(
					fs.access(
						path.join(workspace, '.wpk', 'apply', 'manifest.json')
					)
				).rejects.toMatchObject({ code: 'ENOENT' });

				const applyResult = await runWpk(
					workspace,
					['apply', '--yes'],
					{
						env: {
							WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
						},
					}
				);

				expect(applyResult.code).toBe(1);
				// Known bug: the reporter never surfaces apply failures when
				// the manifest is missing, so both streams remain empty.
				expect(applyResult.stdout).toBe('');
				expect(applyResult.stderr).toBe('');
			},
			{ chdir: false }
		);
	});
});
