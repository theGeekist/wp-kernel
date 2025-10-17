import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner } from '../../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import { loadKernelConfig } from '../../../config';
import { createWorkspace } from '../../workspace';
import { createPatcher } from '../../builders';
import {
	TMP_PREFIX,
	createLoadedConfig,
} from '../__test-support__/apply.test-support';

jest.mock('../../../config');
jest.mock('../../builders', () => ({
	createPatcher: jest.fn(() => ({
		apply: jest.fn(async () => undefined),
	})),
}));
jest.mock('../../workspace', () => ({
	createWorkspace: jest.fn(() => ({
		readText: jest.fn().mockResolvedValue('invalid-json'),
	})),
}));

const loadKernelConfigMock = loadKernelConfig as jest.MockedFunction<
	typeof loadKernelConfig
>;

const withWorkspace = createWorkspaceRunner({ prefix: TMP_PREFIX });

const createPatcherMock = createPatcher as jest.MockedFunction<
	typeof createPatcher
>;
const createWorkspaceMock = createWorkspace as jest.MockedFunction<
	typeof createWorkspace
>;

describe('NextApplyCommand manifest handling', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		createPatcherMock.mockClear();
		createWorkspaceMock.mockClear();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reports failure when manifest parsing fails', async () => {
		await withWorkspace(async (workspace) => {
			loadKernelConfigMock.mockResolvedValue(
				createLoadedConfig(workspace)
			);

			const command = new ApplyModule.NextApplyCommand();
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(createWorkspaceMock).toHaveBeenCalledWith(workspace);
			expect(createPatcherMock).toHaveBeenCalled();
			expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
		});
	});
});
