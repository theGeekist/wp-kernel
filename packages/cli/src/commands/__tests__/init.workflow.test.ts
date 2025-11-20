import { createCommandReporterHarness } from '@cli-tests/cli';
import { WPKernelError } from '@wpkernel/core/error';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { runInitWorkflow } from '../init/workflow';
import type { InitWorkflowOptions } from '../init/types';
import type { Workspace } from '../../workspace';
import {
	installComposerDependenciesMock,
	installNodeDependenciesMock,
	measureStageMock,
	resetInitWorkflowMocks,
	resolveDependencyVersionsMock,
	resolveInstallBudgetsMock,
	writeScaffoldFilesMock,
} from '@cli-tests/cli/init-workflow.test-support';

jest.mock('../init/scaffold', () => {
	const { scaffoldMocks } = jest.requireActual(
		'@cli-tests/cli/init-workflow.test-support'
	);
	return scaffoldMocks;
});
jest.mock('../init/package-json', () => {
	const { packageJsonMocks } = jest.requireActual(
		'@cli-tests/cli/init-workflow.test-support'
	);
	return packageJsonMocks;
});
jest.mock('../init/dependency-versions', () => {
	const { dependencyMocks } = jest.requireActual(
		'@cli-tests/cli/init-workflow.test-support'
	);
	return dependencyMocks;
});
jest.mock('../init/installers', () => {
	const { installerMocks } = jest.requireActual(
		'@cli-tests/cli/init-workflow.test-support'
	);
	return installerMocks;
});
jest.mock('../init/timing', () => {
	const actual = jest.requireActual('../init/timing');
	const { timingMocks } = jest.requireActual(
		'@cli-tests/cli/init-workflow.test-support'
	);
	return { ...actual, ...timingMocks };
});

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return makeWorkspaceMock({
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		...overrides,
	});
}

describe('runInitWorkflow', () => {
	beforeEach(() => {
		resetInitWorkflowMocks();
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
			node: 5_000,
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
			workspace.root,
			'npm',
			undefined,
			{ verbose: false }
		);
		expect(measureStageMock).toHaveBeenCalledWith(
			expect.objectContaining({ stage: 'init.install.composer' })
		);
		expect(installComposerDependenciesMock).toHaveBeenCalledWith(
			workspace.root,
			undefined,
			{ verbose: false }
		);
		expect(result.installations).toEqual({
			node: {
				manager: 'npm',
				measurement: { durationMs: 1_234, budgetMs: 5_000 },
			},
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
