import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createCommandReporterHarness,
} from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildInitCommand } from '../init';
import type { buildWorkspace } from '../../workspace/filesystem';
import * as workspaceModule from '../../workspace';

describe('InitCommand (unit)', () => {
	it('warns when git repository is missing before running workflow', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo-project' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const runWorkflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
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
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
		});

		const InitCommand = buildInitCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			buildReporter: () => reporter,
			runWorkflow,
			checkGitRepository: jest.fn().mockResolvedValue(false),
			buildReadinessRegistry: buildReadinessRegistry as never,
		});

		const command = new InitCommand();
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Git repository not detected. Run `git init` to enable version control before committing generated files.'
		);
		expect(runWorkflow).toHaveBeenCalled();
		expect(readinessPlan).toHaveBeenCalledWith([
			'workspace-hygiene',
			'composer',
			'php-runtime',
			'php-driver',
			'php-printer-path',
			'tsx-runtime',
		]);
		expect(readinessRun).toHaveBeenCalledTimes(1);
		expect(stdout.toString()).toContain('plugin scaffold');
	});

	it('wraps unexpected git detection failures in a developer error', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo-project' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const runWorkflow = jest.fn();
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: jest.fn().mockImplementation((keys: string[]) => ({
				keys,
				run: jest.fn(),
			})),
		});

		const InitCommand = buildInitCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			buildReporter: () => reporter,
			runWorkflow,
			checkGitRepository: jest
				.fn()
				.mockRejectedValue(new Error('fatal: git broken')),
			buildReadinessRegistry: buildReadinessRegistry as never,
		});

		const command = new InitCommand();
		const { stderr } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
		expect(runWorkflow).not.toHaveBeenCalled();
		expect(reporter.warn).not.toHaveBeenCalled();
		const output = stderr.toString();
		expect(output).toContain(
			'[wpk] init failed: Unable to verify git repository status for init command.'
		);
	});

	it('maps --yes to workspace hygiene overrides', async () => {
		const ensureGeneratedSpy = jest
			.spyOn(workspaceModule, 'ensureGeneratedPhpClean')
			.mockResolvedValue(undefined);
		const workspace = makeWorkspaceMock({ root: '/tmp/demo-project' });
		const reporters = createCommandReporterHarness();
		const reporter = reporters.create();
		const runWorkflow = jest.fn().mockResolvedValue({
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
		const buildReadinessRegistry = jest.fn().mockReturnValue({
			register: jest.fn(),
			plan: readinessPlan,
		});

		const InitCommand = buildInitCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			buildReporter: () => reporter,
			runWorkflow,
			checkGitRepository: jest.fn().mockResolvedValue(true),
			buildReadinessRegistry: buildReadinessRegistry as never,
		});

		const command = new InitCommand();
		command.yes = true;
		const { stdout } = assignCommandContext(command, {
			cwd: workspace.root,
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		const registryOptions = buildReadinessRegistry.mock.calls[0]?.[0];
		expect(
			registryOptions?.helperOverrides?.workspaceHygiene
		).toBeDefined();
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
