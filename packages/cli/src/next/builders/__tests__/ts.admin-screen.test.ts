import path from 'node:path';
import {
	createTsBuilder,
	createAdminScreenCreator,
	createDataViewFixtureCreator,
} from '../ts';
import {
	withWorkspace,
	createKernelConfigSource,
	createDataViewsConfig,
	createBuilderArtifacts,
	createReporter,
	createOutput,
	normalise,
	prefixRelative,
} from '../tests/ts.test-support';

describe('createTsBuilder – admin screen creator', () => {
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

			const configSource = createKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const dataviews = createDataViewsConfig();
			const { ir, options } = createBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = createReporter();
			const output = createOutput();
			const builder = createTsBuilder({
				creators: [
					createAdminScreenCreator(),
					createDataViewFixtureCreator(),
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
				"import { KernelError } from '@wpkernel/core/contracts';"
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

	it('falls back to configured aliases when imports cannot be resolved', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = createKernelConfigSource();
			await workspace.write('kernel.config.ts', configSource);

			const dataviews = createDataViewsConfig();
			const { ir, options } = createBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = createReporter();
			const output = createOutput();
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
				'JobsAdminScreen.tsx'
			);
			const screenContents = await workspace.readText(screenPath);

			expect(screenContents).toContain(
				"import { job } from '@/resources/job';"
			);
			expect(screenContents).toContain(
				"import { kernel } from '@/bootstrap/kernel';"
			);
		});
	});

	it('respects custom screen metadata for imports and naming', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = createDataViewsConfig({
				screen: {
					component: 'JobsAdminCustomScreen',
					route: '/custom/jobs',
					resourceImport: '@/custom/resources/jobResource',
					resourceSymbol: 'jobResource',
					kernelImport: '@/custom/kernel/runtime',
					kernelSymbol: 'customKernel',
				},
			});

			const configSource = createKernelConfigSource({
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
			await workspace.write('kernel.config.ts', configSource);

			const { ir, options } = createBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = createReporter();
			const output = createOutput();
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
			const dataviews = createDataViewsConfig();
			delete (dataviews as { screen?: typeof dataviews.screen }).screen;

			const { ir, options } = createBuilderArtifacts({
				dataviews,
				resourceName: 'Job Board',
				resourceKey: 'job-board',
				sourcePath: path.join(root, 'kernel.config.ts'),
			});

			const reporter = createReporter();
			const output = createOutput();
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
