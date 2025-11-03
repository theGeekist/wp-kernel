import path from 'node:path';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildCreateCommand } from '../create';
import type { buildWorkspace } from '../../workspace/filesystem';

describe('CreateCommand', () => {
	it('runs init workflow, initialises git, and installs dependencies', async () => {
		const workflow = jest.fn().mockResolvedValue({
			manifest: { writes: [], deletes: [] },
			summaryText: '[wpk] init created plugin scaffold for demo\n',
			summaries: [],
			dependencySource: 'fallback',
			namespace: 'demo',
			templateName: 'plugin',
		});
		const checkGit = jest.fn().mockResolvedValue(false);
		const initGit = jest.fn().mockResolvedValue(undefined);
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const composerInstall = jest.fn().mockResolvedValue(undefined);
		const ensureDirectory = jest.fn().mockResolvedValue(undefined);

		const workspaceRoot = path.join(process.cwd(), 'demo-workspace');
		const workspace = makeWorkspaceMock({ root: workspaceRoot });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			checkGitRepository: checkGit,
			initGitRepository: initGit,
			installNodeDependencies: npmInstall,
			installComposerDependencies: composerInstall,
			ensureCleanDirectory: ensureDirectory,
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
		expect(checkGit).toHaveBeenCalledWith(workspace.root);
		expect(initGit).toHaveBeenCalledWith(workspace.root);
		expect(npmInstall).toHaveBeenCalledWith(workspace.root);
		expect(composerInstall).toHaveBeenCalledWith(workspace.root);
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
		const checkGit = jest.fn().mockResolvedValue(true);
		const initGit = jest.fn().mockResolvedValue(undefined);
		const npmInstall = jest.fn().mockResolvedValue(undefined);
		const composerInstall = jest.fn().mockResolvedValue(undefined);

		const workspace = makeWorkspaceMock({ root: process.cwd() });

		const CreateCommand = buildCreateCommand({
			buildWorkspace: (() => workspace) as typeof buildWorkspace,
			runWorkflow: workflow,
			checkGitRepository: checkGit,
			initGitRepository: initGit,
			installNodeDependencies: npmInstall,
			installComposerDependencies: composerInstall,
			ensureCleanDirectory: jest.fn().mockResolvedValue(undefined),
		});

		const command = new CreateCommand();
		command.skipInstall = true;
		const { stdout } = assignCommandContext(command, {
			cwd: process.cwd(),
		});

		const exit = await command.execute();

		expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
		expect(npmInstall).not.toHaveBeenCalled();
		expect(composerInstall).not.toHaveBeenCalled();
		expect(stdout.toString()).toContain('summary');
	});
});
