import fs from 'node:fs/promises';
import path from 'node:path';
import { withCliIntegration } from '../test-support/cli-integration.test-support';

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
		await withCliIntegration(
			async ({ run, expectSuccessfulInit, fromWorkspace }) => {
				const initResult = await expectSuccessfulInit(
					'generate-apply-plugin'
				);
				expect(initResult.code).toBe(0);
				expect(initResult.stderr).toBe('');

				const traceFile = fromWorkspace('.wpk', 'php-driver.trace.log');
				const generateResult = await run(['generate', '--verbose'], {
					env: {
						WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
						PHP_DRIVER_TRACE_FILE: traceFile,
					},
				});
				expect(generateResult.code).toBe(2);
				expect(generateResult.stdout).toBe('');
				expect(generateResult.stderr).toContain(
					'Failed to locate apply manifest after generation.'
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
				expect(eventNames).toContain('success');
				expect(eventNames).not.toContain('failure');

				await expect(
					fs.access(fromWorkspace('.wpk', 'apply', 'manifest.json'))
				).rejects.toMatchObject({ code: 'ENOENT' });

				const applyResult = await run(['apply', '--yes'], {
					env: {
						WPK_PHP_AUTOLOAD: PHP_JSON_AST_AUTOLOAD,
					},
				});

				expect(applyResult.code).toBe(1);
				expect(applyResult.stdout).toBe('');
				expect(applyResult.stderr).toContain(
					'[wpk.cli][fatal] Failed to apply workspace patches.'
				);
				expect(applyResult.stderr).toContain(
					'Apply requires a git repository.'
				);
			}
		);
	});
});
