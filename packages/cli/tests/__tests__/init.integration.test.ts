import fs from 'node:fs/promises';
import path from 'node:path';
import { createReporterMock } from '@wpkernel/test-utils/cli';
import { withWorkspace } from '../workspace.test-support';
import { buildWorkspace } from '../../src/next/workspace';
import { runInitWorkflow } from '../../src/commands/init/workflow';

describe('runInitWorkflow integration', () => {
	it('seeds kernel assets in a clean workspace', async () => {
		await withWorkspace(
			async (workspaceRoot) => {
				const workspace = buildWorkspace(workspaceRoot);
				const reporter = createReporterMock();

				const result = await runInitWorkflow({
					workspace,
					reporter,
					verbose: false,
					force: false,
				});

				const summariesByPath = new Map(
					result.summaries.map((entry) => [entry.path, entry.status])
				);
				expect(summariesByPath.get('wpk.config.ts')).toBe('created');
				expect(summariesByPath.get('tsconfig.json')).toBe('created');
				expect(summariesByPath.get('composer.json')).toBe('created');

				const wpkConfig = await fs.readFile(
					path.join(workspaceRoot, 'wpk.config.ts'),
					'utf8'
				);
				expect(wpkConfig).toContain('namespace:');
			},
			{ chdir: false }
		);
	});

	it('skips author-owned files when adopting an existing plugin', async () => {
		await withWorkspace(
			async (workspaceRoot) => {
				const composerPath = path.join(workspaceRoot, 'composer.json');
				const composerTemplate = JSON.stringify(
					{
						name: 'existing/plugin',
						autoload: {
							'psr-4': { 'Existing\\': 'inc/' },
						},
					},
					null,
					2
				);

				await fs.mkdir(path.join(workspaceRoot, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					composerPath,
					`${composerTemplate}\n`,
					'utf8'
				);
				await fs.writeFile(
					path.join(workspaceRoot, 'src', 'index.ts'),
					"console.log('existing front-end');\n",
					'utf8'
				);
				await fs.mkdir(path.join(workspaceRoot, 'inc'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspaceRoot, 'inc', '.gitkeep'),
					'',
					'utf8'
				);
				await fs.writeFile(
					path.join(workspaceRoot, 'existing-plugin.php'),
					`<?php\n/*\nPlugin Name: Existing Plugin\n*/\n`,
					'utf8'
				);

				const workspace = buildWorkspace(workspaceRoot);
				const reporter = createReporterMock();

				const result = await runInitWorkflow({
					workspace,
					reporter,
					verbose: false,
					force: false,
				});

				const statuses = new Map(
					result.summaries.map((entry) => [entry.path, entry.status])
				);
				expect(statuses.get('composer.json')).toBe('skipped');
				expect(statuses.get('src/index.ts')).toBe('skipped');
				expect(statuses.get('inc/.gitkeep')).toBe('skipped');
				expect(statuses.get('wpk.config.ts')).toBe('created');

				const composerContents = await fs.readFile(
					composerPath,
					'utf8'
				);
				expect(composerContents).toBe(`${composerTemplate}\n`);
				expect(reporter.info).toHaveBeenCalledWith(
					expect.stringContaining('composer autoload entries')
				);
				expect(reporter.info).toHaveBeenCalledWith(
					expect.stringContaining(
						'plugin header in existing-plugin.php'
					)
				);
			},
			{ chdir: false }
		);
	});

	it('overwrites author files when force is provided', async () => {
		await withWorkspace(
			async (workspaceRoot) => {
				await fs.mkdir(path.join(workspaceRoot, 'inc'), {
					recursive: true,
				});
				await fs.mkdir(path.join(workspaceRoot, 'src'), {
					recursive: true,
				});
				await fs.writeFile(
					path.join(workspaceRoot, 'composer.json'),
					JSON.stringify({ name: 'existing/plugin' }, null, 2),
					'utf8'
				);
				await fs.writeFile(
					path.join(workspaceRoot, 'src', 'index.ts'),
					"console.log('existing front-end');\n",
					'utf8'
				);

				const workspace = buildWorkspace(workspaceRoot);
				const reporter = createReporterMock();

				const result = await runInitWorkflow({
					workspace,
					reporter,
					verbose: false,
					force: true,
				});

				const statuses = new Map(
					result.summaries.map((entry) => [entry.path, entry.status])
				);
				expect(statuses.get('composer.json')).toBe('updated');
				expect(statuses.get('src/index.ts')).toBe('updated');
				expect(statuses.has('inc/.gitkeep')).toBe(true);

				const composerContents = await fs.readFile(
					path.join(workspaceRoot, 'composer.json'),
					'utf8'
				);
				expect(composerContents).not.toContain('existing/plugin');
				expect(composerContents).toContain('"psr-4"');
			},
			{ chdir: false }
		);
	});
});
