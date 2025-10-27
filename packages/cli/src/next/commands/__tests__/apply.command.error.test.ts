import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '@wpkernel/test-utils/next/commands/apply.test-support';

const withWorkspace = buildWorkspaceRunner({
	prefix: TMP_PREFIX,
	async setup(workspace) {
		await fs.mkdir(path.join(workspace, '.git'), { recursive: true });
	},
});

describe('NextApplyCommand error handling', () => {
	it('maps validation kernel errors to validation exit code', async () => {
		await withWorkspace(async (workspace) => {
			const applyMock = jest.fn(async () => {
				throw new WPKernelError('ValidationError', {
					message: 'apply failed',
				});
			});
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const createPatcher = jest.fn().mockReturnValue({
				apply: applyMock,
			});

			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				createPatcher,
			});
			const command = new ApplyCommand();
			command.yes = true;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
		});
	});
});
