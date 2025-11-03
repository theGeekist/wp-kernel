import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createReporterMock,
} from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildInitCommand } from '../init';
import type { buildWorkspace } from '../../workspace/filesystem';

describe('InitCommand (unit)', () => {
	it('warns when git repository is missing before running workflow', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo-project' });
		const reporter = createReporterMock();
		const runWorkflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});

		const InitCommand = buildInitCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			buildReporter: () => reporter,
			runWorkflow,
			checkGitRepository: jest.fn().mockResolvedValue(false),
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
		expect(stdout.toString()).toContain('plugin scaffold');
	});

	it('wraps unexpected git detection failures in a developer error', async () => {
		const workspace = makeWorkspaceMock({ root: '/tmp/demo-project' });
		const reporter = createReporterMock();
		const runWorkflow = jest.fn();

		const InitCommand = buildInitCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			buildReporter: () => reporter,
			runWorkflow,
			checkGitRepository: jest
				.fn()
				.mockRejectedValue(new Error('fatal: git broken')),
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
});
