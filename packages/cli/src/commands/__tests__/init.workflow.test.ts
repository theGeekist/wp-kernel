import { createCommandReporterHarness } from '@wpkernel/test-utils/cli';
import { WPKernelError } from '@wpkernel/core/error';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { runInitWorkflow } from '../init/workflow';
import type { InitWorkflowOptions } from '../init/types';
import {
	installNodeDependencies,
	installComposerDependencies,
} from '../init/installers';
import {
	measureStage,
	resolveInstallBudgets,
	DEFAULT_NODE_INSTALL_BUDGET_MS,
	DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
} from '../init/timing';
import {
	assertNoCollisions,
	buildPathsReplacement,
	buildReplacementMap,
	buildScaffoldDescriptors,
	writeScaffoldFiles,
} from '../init/scaffold';
import { writePackageJson } from '../init/package-json';
import { resolveDependencyVersions } from '../init/dependency-versions';
import type { DependencyResolution } from '../init/dependency-versions';
import type { Workspace } from '../../workspace';

type WriteScaffoldFiles = typeof writeScaffoldFiles;
type BuildScaffoldDescriptors = typeof buildScaffoldDescriptors;
type BuildReplacementMap = typeof buildReplacementMap;
type BuildPathsReplacement = typeof buildPathsReplacement;
type WritePackageJson = typeof writePackageJson;

type Resolver = typeof resolveDependencyVersions;

jest.mock('../init/scaffold', () => ({
	assertNoCollisions: jest.fn(),
	buildPathsReplacement: jest.fn(),
	buildReplacementMap: jest.fn(),
	buildScaffoldDescriptors: jest.fn(),
	writeScaffoldFiles: jest.fn(),
}));

jest.mock('../init/package-json', () => {
	const actual = jest.requireActual('../init/package-json');
	return {
		...actual,
		writePackageJson: jest.fn(),
	} satisfies Partial<typeof actual>;
});

jest.mock('../init/dependency-versions', () => ({
	resolveDependencyVersions: jest.fn(),
}));

jest.mock('../init/installers', () => ({
	installNodeDependencies: jest.fn(),
	installComposerDependencies: jest.fn(),
}));

jest.mock('../init/timing', () => {
	const actual = jest.requireActual('../init/timing');
	return {
		...actual,
		measureStage: jest.fn(),
		resolveInstallBudgets: jest.fn(),
	} satisfies Partial<typeof actual>;
});

const resolveDependencyVersionsMock =
	resolveDependencyVersions as jest.MockedFunction<Resolver>;
const writeScaffoldFilesMock =
	writeScaffoldFiles as jest.MockedFunction<WriteScaffoldFiles>;
const assertNoCollisionsMock = assertNoCollisions as jest.MockedFunction<
	typeof assertNoCollisions
>;
const buildScaffoldDescriptorsMock =
	buildScaffoldDescriptors as jest.MockedFunction<BuildScaffoldDescriptors>;
const buildReplacementMapMock =
	buildReplacementMap as jest.MockedFunction<BuildReplacementMap>;
const buildPathsReplacementMock =
	buildPathsReplacement as jest.MockedFunction<BuildPathsReplacement>;
const writePackageJsonMock =
	writePackageJson as jest.MockedFunction<WritePackageJson>;
const installNodeDependenciesMock =
	installNodeDependencies as jest.MockedFunction<
		typeof installNodeDependencies
	>;
const installComposerDependenciesMock =
	installComposerDependencies as jest.MockedFunction<
		typeof installComposerDependencies
	>;
const measureStageMock = measureStage as jest.MockedFunction<
	typeof measureStage
>;
const resolveInstallBudgetsMock = resolveInstallBudgets as jest.MockedFunction<
	typeof resolveInstallBudgets
>;

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return makeWorkspaceMock({
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		...overrides,
	});
}

describe('runInitWorkflow', () => {
	const dependencyResolution: DependencyResolution = {
		source: 'registry',
		sources: ['fallback', 'registry'],
		dependencies: {},
		devDependencies: {},
		peerDependencies: {},
	};

	beforeEach(() => {
		jest.clearAllMocks();

		buildScaffoldDescriptorsMock.mockReturnValue([
			{
				relativePath: 'wpk.config.ts',
				templatePath: 'wpk/wpk.config.ts',
				category: 'wpk',
			},
		]);
		writeScaffoldFilesMock.mockResolvedValue([
			{ path: 'wpk.config.ts', status: 'created' },
		]);
		assertNoCollisionsMock.mockResolvedValue({ skipped: [] });
		buildPathsReplacementMock.mockResolvedValue('"{}"');
		buildReplacementMapMock.mockReturnValue(new Map());
		writePackageJsonMock.mockResolvedValue('updated');
		resolveDependencyVersionsMock.mockResolvedValue(dependencyResolution);
		installNodeDependenciesMock.mockResolvedValue(undefined);
		installComposerDependenciesMock.mockResolvedValue(undefined);
		resolveInstallBudgetsMock.mockReturnValue({
			npm: DEFAULT_NODE_INSTALL_BUDGET_MS,
			composer: DEFAULT_COMPOSER_INSTALL_BUDGET_MS,
		});
		measureStageMock.mockImplementation(async ({ run, budgetMs }) => {
			await run();
			return { durationMs: 0, budgetMs };
		});
	});

	it('logs dependency resolution details when verbose and env requests registry versions', async () => {
		const commit = jest.fn(async () => ({ writes: [], deletes: [] }));
		const workspace = createWorkspace({ commit });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		const options: InitWorkflowOptions = {
			workspace,
			reporter,
			projectName: 'Demo Project',
			template: 'plugin',
			force: false,
			verbose: true,
			preferRegistryVersionsFlag: false,
			env: { WPK_PREFER_REGISTRY_VERSIONS: 'true' },
		};

		const result = await runInitWorkflow(options);

		expect(resolveDependencyVersionsMock).toHaveBeenCalledWith(
			workspace.root,
			expect.objectContaining({
				preferRegistryVersions: true,
			})
		);
		expect(writeScaffoldFilesMock).toHaveBeenCalledWith(
			expect.objectContaining({ force: false, skip: undefined })
		);
		expect(reporter.info).toHaveBeenCalledWith(
			'init dependency versions resolved from registry'
		);
		expect(commit).toHaveBeenCalledWith('init');
		expect(result.summaries).toContainEqual({
			path: 'package.json',
			status: 'updated',
		});
		expect(result.summaryText).toContain('demo-project');
	});

	it('rolls back workspace changes when the workflow throws', async () => {
		const rollback = jest.fn(async () => ({ writes: [], deletes: [] }));
		const workspace = createWorkspace({ rollback });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		writeScaffoldFilesMock.mockRejectedValueOnce(
			new Error('scaffold failed')
		);

		await expect(
			runInitWorkflow({
				workspace,
				reporter,
				verbose: false,
			})
		).rejects.toThrow('scaffold failed');

		expect(rollback).toHaveBeenCalledWith('init');
		expect(reporter.info).not.toHaveBeenCalled();
	});

	it('captures installer timings when installation is enabled', async () => {
		const workspace = createWorkspace();
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		writeScaffoldFilesMock.mockResolvedValue([
			{ path: 'wpk.config.ts', status: 'created' },
			{ path: 'composer.json', status: 'created' },
		]);

		resolveInstallBudgetsMock.mockReturnValue({
			npm: 5_000,
			composer: 7_000,
		});
		measureStageMock
			.mockImplementationOnce(async ({ run, budgetMs }) => {
				await run();
				return { durationMs: 1_234, budgetMs };
			})
			.mockImplementationOnce(async ({ run, budgetMs }) => {
				await run();
				return { durationMs: 2_345, budgetMs };
			});

		const result = await runInitWorkflow({
			workspace,
			reporter,
			installDependencies: true,
		});

		expect(measureStageMock).toHaveBeenCalledWith(
			expect.objectContaining({ stage: 'init.install.npm' })
		);
		expect(installNodeDependenciesMock).toHaveBeenCalledWith(
			workspace.root
		);
		expect(measureStageMock).toHaveBeenCalledWith(
			expect.objectContaining({ stage: 'init.install.composer' })
		);
		expect(installComposerDependenciesMock).toHaveBeenCalledWith(
			workspace.root
		);
		expect(result.installations).toEqual({
			npm: { durationMs: 1_234, budgetMs: 5_000 },
			composer: { durationMs: 2_345, budgetMs: 7_000 },
		});
	});

	it('propagates budget errors emitted by measured installers', async () => {
		const workspace = createWorkspace();
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();

		writeScaffoldFilesMock.mockResolvedValueOnce([
			{ path: 'wpk.config.ts', status: 'created' },
			{ path: 'composer.json', status: 'created' },
			{ path: 'package.json', status: 'updated' },
		]);

		measureStageMock
			.mockImplementationOnce(async ({ run, budgetMs }) => {
				await run();
				return { durationMs: 1_000, budgetMs };
			})
			.mockImplementationOnce(async () => {
				throw new WPKernelError('EnvironmentalError', {
					data: { reason: 'budget.exceeded' },
				});
			});

		await expect(
			runInitWorkflow({
				workspace,
				reporter,
				installDependencies: true,
			})
		).rejects.toEqual(
			expect.objectContaining({
				code: 'EnvironmentalError',
				data: expect.objectContaining({ reason: 'budget.exceeded' }),
			})
		);
		expect(installNodeDependenciesMock).toHaveBeenCalledTimes(1);
		expect(installComposerDependenciesMock).not.toHaveBeenCalled();
	});
});
