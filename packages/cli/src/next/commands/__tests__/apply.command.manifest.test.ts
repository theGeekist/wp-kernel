import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '@wpkernel/test-utils/next/commands/apply.test-support';

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

describe('NextApplyCommand manifest handling', () => {
	it('reports failure when manifest parsing fails', async () => {
		await withWorkspace(async (workspace) => {
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readText = jest.fn().mockResolvedValue('invalid-json');
			const buildWorkspace = jest.fn().mockReturnValue({
				readText,
			});
			const createPatcher = jest.fn().mockReturnValue({
				apply: jest.fn(async () => undefined),
			});

			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildWorkspace,
				createPatcher,
			});
			const command = new ApplyCommand();
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
