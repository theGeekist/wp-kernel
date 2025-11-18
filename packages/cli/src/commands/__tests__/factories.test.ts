import type { FileManifest } from '../../workspace';
import { makeWorkspaceMock } from '@wpkernel/test-utils/workspace.test-support';

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
			const helperDescriptors = [
				{
					key: 'workspace-hygiene',
					metadata: { label: 'Workspace hygiene', scopes: ['init'] },
				},
				{
					key: 'composer',
					metadata: {
						label: 'Composer',
						scopes: ['init'],
						tags: ['requires-install'],
					},
				},
				{
					key: 'php-runtime',
					metadata: { label: 'PHP runtime', scopes: ['init'] },
				},
				{
					key: 'php-codemod-ingestion',
					metadata: {
						label: 'PHP codemod ingestion',
						scopes: ['init'],
					},
				},
				{
					key: 'php-printer-path',
					metadata: { label: 'PHP printer path', scopes: ['init'] },
				},
				{
					key: 'tsx-runtime',
					metadata: {
						label: 'TSX runtime',
						scopes: ['init'],
						tags: ['requires-install'],
					},
				},
			];

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
			const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
			const buildReadinessRegistry = jest.fn().mockReturnValue({
				register: jest.fn(),
				plan: jest.fn().mockImplementation((keys: string[]) => ({
					keys,
					run: readinessRun,
				})),
				describe: () => helperDescriptors,
			});

			const { buildInitCommand } = await import('../init');
			const Init = buildInitCommand({
				buildWorkspace: buildWorkspaceMock,
				buildReporter: buildReporterMock,
				runWorkflow: workflow,
				checkGitRepository: checkGit,
				buildReadinessRegistry: buildReadinessRegistry as never,
			});

			const command = new Init();
			command.cli = {} as never;
			command.context = buildCommandContext() as never;
			command.name = 'demo';

			const exitCode = await command.execute();

			expect(exitCode).toBe(0);
			expect(buildWorkspaceMock).toHaveBeenCalledTimes(1);
			expect(buildReporterMock).toHaveBeenCalledTimes(1);
			expect(checkGit).toHaveBeenCalledWith(workspace.root);
			expect(buildReadinessRegistry).toHaveBeenCalledTimes(1);
			expect(readinessRun).toHaveBeenCalledTimes(1);
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
