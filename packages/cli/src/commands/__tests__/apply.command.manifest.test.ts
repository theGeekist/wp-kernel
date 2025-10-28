import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '@wpkernel/test-utils/cli/commands/apply.test-support';

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

describe('NextApplyCommand manifest handling', () => {
	it('reports failure when manifest parsing fails', async () => {
		await withWorkspace(async (workspace) => {
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readText = jest.fn().mockResolvedValue('invalid-json');
			const dryRun = jest.fn(async (fn) => {
				try {
					const result = await fn();
					return { result, manifest: { writes: [], deletes: [] } };
				} catch (error) {
					throw error;
				}
			});
			const buildWorkspace = jest.fn().mockReturnValue({
				readText,
				resolve: jest.fn(),
				dryRun,
			});
			const createPatcher = jest.fn().mockReturnValue({
				apply: jest.fn(async () => undefined),
			});
			const ensureGitRepository = jest.fn().mockResolvedValue(undefined);
			const appendApplyLog = jest.fn().mockResolvedValue(undefined);

			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildWorkspace,
				createPatcher,
				ensureGitRepository,
				appendApplyLog,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(buildWorkspace).toHaveBeenCalledWith(workspace);
			expect(createPatcher).toHaveBeenCalled();
			expect(readText).toHaveBeenCalledWith(
				ApplyModule.PATCH_MANIFEST_PATH
			);
			expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
		});
	});
});
