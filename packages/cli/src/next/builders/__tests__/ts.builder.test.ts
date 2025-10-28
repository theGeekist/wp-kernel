import path from 'node:path';
import type { ResourceConfig } from '@wpkernel/core/resource';
import {
	createTsBuilder,
	buildAdminScreenCreator,
	buildDataViewFixtureCreator,
	type TsBuilderCreator,
} from '../ts';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildDataViewsConfig,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/next/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import { validateGeneratedImports } from '../../../commands/run-generate/validation';

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, { createWorkspace: (root) => buildWorkspace(root) });

jest.mock('../../../commands/run-generate/validation', () => ({
	validateGeneratedImports: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
	jest.clearAllMocks();
});

describe('createTsBuilder - orchestration', () => {
	it('skips generation when no resources expose DataViews metadata', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource({ dataviews: null });
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews: null,
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

			expect(reporter.debug).toHaveBeenCalledWith(
				'createTsBuilder: no resources registered.'
			);
			expect(output.actions).toHaveLength(0);
			expect(validateGeneratedImports).not.toHaveBeenCalled();
			await expect(
				workspace.exists(
					path.join(
						'.generated',
						'ui',
						'app',
						'job',
						'admin',
						'JobsAdminScreen.tsx'
					)
				)
			).resolves.toBe(false);
		});
	});

	it('supports extending the builder with custom creators', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/bootstrap/kernel.ts',
				'export const kernel = { getUIRuntime: () => ({}) };\n'
			);

			const dataviews = buildDataViewsConfig();
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();
			const customCreator: TsBuilderCreator = {
				key: 'builder.generate.ts.custom.test',
				async create({ project, descriptor, emit }) {
					const filePath = path.join(
						'.generated',
						'ui',
						'extras',
						`${descriptor.key}.ts`
					);
					const sourceFile = project.createSourceFile(filePath, '', {
						overwrite: true,
					});
					sourceFile.addStatements((writer) => {
						writer.write('export const marker = ');
						writer.quote(descriptor.name);
						writer.write(';');
						writer.newLine();
					});

					await emit({ filePath, sourceFile });
				},
			};

			const builder = createTsBuilder({
				creators: [
					buildAdminScreenCreator(),
					buildDataViewFixtureCreator(),
					customCreator,
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

			const customArtifactPath = path.join(
				'.generated',
				'ui',
				'extras',
				'job.ts'
			);

			await expect(
				workspace.readText(customArtifactPath)
			).resolves.toContain("export const marker = 'job';");
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join(
					'.generated',
					'ui',
					'app',
					'job',
					'admin',
					'JobsAdminScreen.tsx'
				),
				path.join(
					'.generated',
					'ui',
					'fixtures',
					'dataviews',
					'job.ts'
				),
				customArtifactPath,
			]);
			const debugCalls = (reporter.debug as jest.Mock).mock.calls;
			const debugMessage = debugCalls[debugCalls.length - 1]?.[0];
			expect(debugMessage).toContain(
				'createTsBuilder: 3 files written ('
			);
			expect(debugMessage).toContain(
				'.generated/ui/app/job/admin/JobsAdminScreen.tsx'
			);
			expect(debugMessage).toContain(
				'.generated/ui/fixtures/dataviews/job.ts'
			);
			expect(debugMessage).toContain('.generated/ui/extras/job.ts');
		});
	});

	it('invokes lifecycle hooks around creators', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const dataviews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews,
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const hooks = {
				onBeforeCreate: jest.fn(),
				onAfterCreate: jest.fn(),
				onAfterEmit: jest.fn(),
			};

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createTsBuilder({ hooks });

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

			expect(hooks.onBeforeCreate).toHaveBeenCalledTimes(2);
			expect(hooks.onAfterCreate).toHaveBeenCalledTimes(2);
			expect(hooks.onBeforeCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					descriptor: expect.objectContaining({ key: 'job' }),
				})
			);
			expect(hooks.onAfterCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					descriptor: expect.objectContaining({ key: 'job' }),
				})
			);

			expect(hooks.onAfterEmit).toHaveBeenCalledTimes(1);
			const afterEmitArg = hooks.onAfterEmit.mock.calls[0][0];
			const emitted = afterEmitArg.emitted.map((file: string) =>
				file.replace(/\\/g, '/')
			);
			expect(emitted).toEqual(
				expect.arrayContaining([
					'.generated/ui/app/job/admin/JobsAdminScreen.tsx',
					'.generated/ui/fixtures/dataviews/job.ts',
				])
			);
			expect(afterEmitArg.workspace).toBe(workspace);
			expect(afterEmitArg.reporter).toBe(reporter);

			expect(validateGeneratedImports).toHaveBeenCalledTimes(1);
			const validationCall = (validateGeneratedImports as jest.Mock).mock
				.calls[0]?.[0];
			expect(validationCall.projectRoot).toBe(workspace.root);
			expect(
				validationCall.summary.entries.map(
					(entry: { path: string }) => entry.path
				)
			).toEqual(
				expect.arrayContaining([
					'.generated/ui/app/job/admin/JobsAdminScreen.tsx',
					'.generated/ui/fixtures/dataviews/job.ts',
				])
			);
		});
	});

	it('emits artifacts for each resource exposing DataViews configuration', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			await workspace.write(
				'src/resources/job.ts',
				'export const job = { ui: { admin: { dataviews: {} } } };\n'
			);
			await workspace.write(
				'src/resources/task.ts',
				'export const task = { ui: { admin: { dataviews: {} } } };\n'
			);

			const jobDataViews = buildDataViewsConfig();
			const { ir, options } = buildBuilderArtifacts({
				dataviews: jobDataViews,
				resourceKey: 'job',
				resourceName: 'Job',
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const taskDataViews = buildDataViewsConfig({
				screen: {
					component: 'TasksAdminScreen',
					route: '/admin/tasks',
				},
			});

			const taskResource: ResourceConfig = {
				name: 'Task',
				schema: 'auto',
				routes: {},
				cacheKeys: {},
				ui: { admin: { dataviews: taskDataViews } },
			} as ResourceConfig;

			options.config.resources.task = taskResource;
			ir.config.resources.task = taskResource;
			ir.resources.push({
				name: 'Task',
				schemaKey: 'task',
				schemaProvenance: 'manual',
				routes: [],
				cacheKeys: {
					list: { segments: ['task', 'list'], source: 'config' },
					get: { segments: ['task', 'get'], source: 'config' },
				},
				hash: 'task-hash',
				warnings: [],
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

			await expect(
				workspace.exists(
					path.join(
						'.generated',
						'ui',
						'app',
						'Job',
						'admin',
						'JobsAdminScreen.tsx'
					)
				)
			).resolves.toBe(true);
			await expect(
				workspace.exists(
					path.join(
						'.generated',
						'ui',
						'app',
						'Task',
						'admin',
						'TasksAdminScreen.tsx'
					)
				)
			).resolves.toBe(true);
			expect(output.actions.map((action) => action.file)).toEqual([
				path.join(
					'.generated',
					'ui',
					'app',
					'Job',
					'admin',
					'JobsAdminScreen.tsx'
				),
				path.join(
					'.generated',
					'ui',
					'fixtures',
					'dataviews',
					'job.ts'
				),
				path.join(
					'.generated',
					'ui',
					'app',
					'Task',
					'admin',
					'TasksAdminScreen.tsx'
				),
				path.join(
					'.generated',
					'ui',
					'fixtures',
					'dataviews',
					'task.ts'
				),
			]);
		});
	});
});
