import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createReporterMock,
} from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildCreateCommand } from '../create';
import type { buildWorkspace } from '../../workspace/filesystem';
import * as workspaceModule from '../../workspace';

describe('CreateCommand', () => {
	it('runs init workflow, readiness plan, and installs npm dependencies', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const ensureDirectory = jest.fn().mockResolvedValue(undefined);
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: readinessRun,
			}));
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
		});

		const workspaceRoot = path.join(process.cwd(), 'demo-workspace');
		const workspace = makeWorkspaceMock({ root: workspaceRoot });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: npmInstall,
			ensureCleanDirectory: ensureDirectory,
			buildReadinessRegistry: buildReadinessRegistry as never,
		});

		const command = new CreateCommand();
		command.name = 'demo';
		command.target = 'demo';
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(workflow).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				projectName: 'demo',
			})
		);
		expect(ensureDirectory).toHaveBeenCalledWith(
			expect.objectContaining({
				workspace,
				directory: path.resolve(process.cwd(), 'demo'),
				force: false,
			})
		);
		expect(npmInstall).toHaveBeenCalledWith(workspace.root);
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'composer',
			'php-runtime',
			'php-driver',
			'tsx-runtime',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('plugin scaffold');
	});

	it('skips installers when --skip-install is provided', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: 'summary\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: readinessRun,
			}));

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: npmInstall,
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: (() => ({
				register: jest.fn(),
				plan: readinessPlan,
			})) as never,
		});

		const command = new CreateCommand();
		command.skipInstall = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(npmInstall).not.toHaveBeenCalled();
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'git',
			'php-runtime',
			'php-driver',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('summary');
	});

	it('maps --yes to workspace hygiene readiness overrides', async () => {
		const ensureGeneratedSpy = jest
			.spyOn(workspaceModule, 'ensureGeneratedPhpClean')
			.mockResolvedValue(undefined);
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: 'summary\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
		const readinessPlan = jest
			.fn()
			.mockImplementation((keys: string[]) => ({
				keys,
				run: readinessRun,
			}));

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
		});

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			installNodeDependencies: jest.fn().mockResolvedValue(undefined),
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
			buildReadinessRegistry: buildReadinessRegistry as never,
		});

		const command = new CreateCommand();
		command.yes = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		const registryOptions = buildReadinessRegistry.mock.calls[0]?.[0];
		expect(
			registryOptions?.helperOverrides?.workspaceHygiene
		).toBeDefined();
		expect(
			typeof registryOptions?.helperOverrides?.workspaceHygiene
				?.ensureClean
		).toBe('function');
		const reporter = createReporterMock();
		await registryOptions?.helperOverrides?.workspaceHygiene?.ensureClean?.(
			{
				workspace,
				reporter,
			}
		);
		expect(ensureGeneratedSpy).toHaveBeenCalledWith(
			expect.objectContaining({ yes: true })
		);
		expect(stdout.toString()).toContain('summary');

		ensureGeneratedSpy.mockRestore();
	});
});
