import fs from 'node:fs/promises';
import path from 'node:path';
import { createTsBuilder } from '../ts';
import {
	withWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	prefixRelative,
	normalise,
} from '@wpkernel/test-utils/next/builders/tests/ts.test-support';

jest.mock('../../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

describe('createTsBuilder - DataView fixture creator', () => {
	it('generates fixtures referencing the kernel config via a relative path', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			const fixturePath = path.join(
				'.generated',
				'ui',
				'fixtures',
				'dataviews',
				'job.ts'
			);
			const fixtureContents = await workspace.readText(fixturePath);

			const expectedConfigImport = prefixRelative(
				normalise(
					path
						.relative(
							path.dirname(workspace.resolve(fixturePath)),
							workspace.resolve('wpk.config.ts')
						)
						.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
				)
			);

			expect(fixtureContents).toContain(
				`import * as wpkConfigModule from '${expectedConfigImport}';`
			);
			expect(fixtureContents).toContain(
				"wpkConfigModule.wpkConfig.resources['job'].ui!.admin!.dataviews"
			);
			expect(fixtureContents).toContain(
				'export const jobDataViewConfig: ResourceDataViewConfig<unknown, unknown>'
			);
		});
	});

	it('derives fixture names from the resource key', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
					},
					input: {
						phase: 'generate',
						options,
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			const fixturePath = path.join(
				'.generated',
				'ui',
				'fixtures',
				'dataviews',
				'job-board.ts'
			);
			const fixtureContents = await workspace.readText(fixturePath);

			expect(fixtureContents).toContain(
				'export const jobBoardDataViewConfig: ResourceDataViewConfig<unknown, unknown>'
			);
		});
	});

	it('falls back to alias when kernel config path is outside the workspace root', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const externalDir = path.join(
				path.dirname(root),
				'external-kernel-config'
			);
			await fs.mkdir(externalDir, { recursive: true });
			const externalConfigPath = path.join(externalDir, 'wpk.config.ts');
			await fs.writeFile(externalConfigPath, buildWPKernelConfigSource());

			try {
				const dataviews = buildDataViewsConfig();
				const { ir, options } = buildBuilderArtifacts({
					dataviews,
					sourcePath: externalConfigPath,
				});

				const reporter = buildReporter();
				const output = buildOutput();
				const builder = createTsBuilder();

				await builder.apply(
					{
						context: {
							workspace,
							phase: 'generate',
							reporter,
						},
						input: {
							phase: 'generate',
							options,
							ir,
						},
						output,
						reporter,
					},
					undefined
				);

				const fixturePath = path.join(
					'.generated',
					'ui',
					'fixtures',
					'dataviews',
					'job.ts'
				);
				const fixtureContents = await workspace.readText(fixturePath);

				expect(fixtureContents).toContain(
					"import * as wpkConfigModule from '@/external-kernel-config/wpk.config';"
				);
			} finally {
				await fs.rm(externalDir, { recursive: true, force: true });
			}
		});
	});
});
