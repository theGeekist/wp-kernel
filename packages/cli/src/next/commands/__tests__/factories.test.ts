import type { FileManifest } from '../../workspace';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';

function buildCommandContext() {
	return {
		stdout: { write: jest.fn() },
		stderr: { write: jest.fn() },
	} as const;
}

describe('command factories', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	describe('buildInitCommand', () => {
		it('injects workspace, reporter, and workflow dependencies', async () => {
			const workspace = makeWorkspaceMock();
			const reporter = { warn: jest.fn(), info: jest.fn() };
			const workflow = jest.fn().mockResolvedValue({
				manifest: { writes: [], deletes: [] } as FileManifest,
				summaryText: 'summary\n',
				summaries: [],
				dependencySource: 'fallback',
				namespace: 'demo',
				templateName: 'plugin',
			});
			const checkGit = jest.fn().mockResolvedValue(false);
			const buildWorkspaceMock = jest.fn().mockReturnValue(workspace);
			const buildReporterMock = jest.fn().mockReturnValue(reporter);

			const { buildInitCommand } = await import('../init');
			const NextInit = buildInitCommand({
				buildWorkspace: buildWorkspaceMock,
				buildReporter: buildReporterMock,
				runWorkflow: workflow,
				checkGitRepository: checkGit,
			});

			const command = new NextInit();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.name = 'demo';

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(buildWorkspaceMock).toHaveBeenCalledTimes(1);
			expect(buildReporterMock).toHaveBeenCalledTimes(1);
			expect(checkGit).toHaveBeenCalledWith(workspace.root);
			expect(workflow).toHaveBeenCalledWith(
				expect.objectContaining({
					workspace,
					projectName: 'demo',
				})
			);
		});
	});

	// Additional command factory tests live in dedicated suites where behaviour
	// depends on richer dependency graphs (start, doctor, etc.).
});
