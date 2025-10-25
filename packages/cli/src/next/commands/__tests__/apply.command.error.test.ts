import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { KernelError } from '@wpkernel/core/error';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import { loadKernelConfig } from '../../../config';
import { createPatcher } from '../../builders';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '../__test-support__/apply.test-support';

jest.mock('../../../config');

jest.mock('../../builders', () => ({
	createPatcher: jest.fn(),
}));

const loadKernelConfigMock = loadKernelConfig as jest.MockedFunction<
	typeof loadKernelConfig
>;

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

const createPatcherMock = createPatcher as jest.MockedFunction<
	typeof createPatcher
>;

describe('NextApplyCommand error handling', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		createPatcherMock.mockReset();
	});

	it('maps validation kernel errors to validation exit code', async () => {
		await withWorkspace(async (workspace) => {
			const applyMock = jest.fn(async () => {
				throw new KernelError('ValidationError', {
					message: 'apply failed',
				});
			});
			createPatcherMock.mockReturnValue({
				apply: applyMock,
			} as unknown as ReturnType<typeof createPatcher>);

			loadKernelConfigMock.mockResolvedValue(
				buildLoadedConfig(workspace)
			);

			const command = new ApplyModule.NextApplyCommand();
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
		});
	});
});
