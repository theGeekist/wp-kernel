import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import { loadKernelConfig } from '../../../config';
import { buildWorkspace } from '../../workspace';
import { createPatcher } from '../../builders';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '@wpkernel/test-utils/next/commands/apply.test-support';

jest.mock('../../../config');
jest.mock('../../builders', () => ({
	createPatcher: jest.fn(() => ({
		apply: jest.fn(async () => undefined),
	})),
}));
jest.mock('../../workspace', () => ({
	buildWorkspace: jest.fn(() => ({
		readText: jest.fn().mockResolvedValue('invalid-json'),
	})),
}));

const loadKernelConfigMock = loadKernelConfig as jest.MockedFunction<
	typeof loadKernelConfig
>;

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

const createPatcherMock = createPatcher as jest.MockedFunction<
	typeof createPatcher
>;
const buildWorkspaceMock = buildWorkspace as jest.MockedFunction<
	typeof buildWorkspace
>;

describe('NextApplyCommand manifest handling', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		createPatcherMock.mockClear();
		buildWorkspaceMock.mockClear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reports failure when manifest parsing fails', async () => {
		await withWorkspace(async (workspace) => {
			loadKernelConfigMock.mockResolvedValue(
				buildLoadedConfig(workspace)
			);

			const command = new ApplyModule.NextApplyCommand();
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(buildWorkspaceMock).toHaveBeenCalledWith(workspace);
			expect(createPatcherMock).toHaveBeenCalled();
			expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
		});
	});
});
