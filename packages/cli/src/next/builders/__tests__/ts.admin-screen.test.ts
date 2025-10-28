import path from 'node:path';
import {
	createTsBuilder,
	buildAdminScreenCreator,
	buildDataViewFixtureCreator,
} from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	normalise,
	prefixRelative,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/next/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';

jest.mock('../../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, { createWorkspace: (root) => buildWorkspace(root) });

describe('createTsBuilder - admin screen creator', () => {
	it('generates admin screens with resolved relative imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { dataviews: {} } } };\n'
			);

			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({
				creators: [
					buildAdminScreenCreator(),
					buildDataViewFixtureCreator(),
				],
			});

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

			const screenPath = path.join(
				'.generated',
				'ui',
				'app',
				'job',
				'admin',
				'JobsAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				'/** @jsxImportSource @wordpress/element */'
			);
			expect(screenContents).toContain(
				"import { WPKernelError } from '@wpkernel/core/contracts';"
			);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPath)),
						workspace.resolve('src/resources/job.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);
			const expectedKernelImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPath)),
						workspace.resolve('src/bootstrap/kernel.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);

			expect(screenContents).toContain(
				`import { job } from '${prefixRelative(expectedResourceImport)}';`
			);
			expect(screenContents).toContain(
				`import { kernel } from '${prefixRelative(expectedKernelImport)}';`
			);
			expect(screenContents).toContain(
				"export const jobsadminscreenRoute = '/admin/jobs';"
			);
			expect(screenContents).toContain('context: {');
			expect(screenContents).toContain("resourceName: 'job'");
			expect(output.actions.map((action) => action.file)).toContain(
				screenPath
			);
		});
	});

	it('uses the resource key when resolving default imports', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);
			await workspace.write(
				'src/resources/job-board.ts',
				'export const jobBoard = { ui: { admin: { dataviews: {} } } };\n'
			);

			const dataviews = buildDataViewsConfig({
				screen: { component: 'JobBoardAdminScreen' },
			});
			const configSource = buildWPKernelConfigSource({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				dataviews: { screen: { component: 'JobBoardAdminScreen' } },
			});
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({
				creators: [buildAdminScreenCreator()],
			});

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

			const screenPath = path.join(
				'.generated',
				'ui',
				'app',
				'Job Board',
				'admin',
				'JobBoardAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			const expectedResourceImport = normalise(
				path
					.relative(
						path.dirname(workspace.resolve(screenPath)),
						workspace.resolve('src/resources/job-board.ts')
					)
					.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/u, '')
			);

			expect(screenContents).toContain(
				`import { jobBoard } from '${prefixRelative(expectedResourceImport)}';`
			);
			expect(screenContents).not.toContain('@/resources/Job Board');
		});
	});

	it('falls back to configured aliases when imports cannot be resolved', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
			});
			await workspace.write('wpk.config.ts', configSource);

			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				resourceKey: 'job-board',
				resourceName: 'Job Board',
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

			const screenPath = path.join(
				'.generated',
				'ui',
				'app',
				'Job Board',
				'admin',
				'JobsAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				"import { jobBoard } from '@/resources/job-board';"
			);
			expect(screenContents).toContain(
				"import { kernel } from '@/bootstrap/kernel';"
			);
		});
	});

	it('respects custom screen metadata for imports and naming', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig({
				screen: {
					component: 'JobsAdminCustomScreen',
					route: '/custom/jobs',
					resourceImport: '@/custom/resources/jobResource',
					resourceSymbol: 'jobResource',
					kernelImport: '@/custom/kernel/runtime',
					kernelSymbol: 'customKernel',
				},
			});

			const configSource = buildWPKernelConfigSource({
				dataviews: {
					screen: {
						component: 'JobsAdminCustomScreen',
						route: '/custom/jobs',
						resourceImport: '@/custom/resources/jobResource',
						resourceSymbol: 'jobResource',
						kernelImport: '@/custom/kernel/runtime',
						kernelSymbol: 'customKernel',
					},
				},
			});
			await workspace.write('wpk.config.ts', configSource);

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

			const screenPath = path.join(
				'.generated',
				'ui',
				'app',
				'job',
				'admin',
				'JobsAdminCustomScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				"import { customKernel } from '@/custom/kernel/runtime';"
			);
			expect(screenContents).toContain(
				"import { jobResource } from '@/custom/resources/jobResource';"
			);
			expect(screenContents).toContain(
				'<JobsAdminCustomScreenContent />'
			);
			expect(screenContents).toContain(
				"export const jobsadmincustomscreenRoute = '/custom/jobs';"
			);
			expect(screenContents).toContain(
				'const runtime = customKernel.getUIRuntime?.();'
			);
			expect(screenContents).toContain('resource={jobResource}');
		});
	});

	it('derives component naming from resource names when overrides are omitted', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			delete (dataviews as { screen?: typeof dataviews.screen }).screen;

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				resourceName: 'Job Board',
				resourceKey: 'job-board',
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

			const screenPath = path.join(
				'.generated',
				'ui',
				'app',
				'Job Board',
				'admin',
				'JobBoardAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				'function JobBoardAdminScreenContent()'
			);
			expect(screenContents).toContain(
				'export function JobBoardAdminScreen('
			);
			expect(screenContents).not.toContain('Route =');
		});
	});
});
