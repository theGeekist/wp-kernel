import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { WPKernelError } from '@wpkernel/core/error';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '@wpkernel/test-utils/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
	readApplyLogEntries,
} from '@wpkernel/test-utils/cli/commands/apply.test-support';
import type {
	ReadinessHelperDescriptor,
	ReadinessPlan,
	ReadinessRegistry,
} from '../../dx';

const withWorkspace = buildWorkspaceRunner({
	prefix: TMP_PREFIX,
	async setup(workspace) {
		await fs.mkdir(path.join(workspace, '.git'), { recursive: true });
	},
});

function createReadinessRegistryStub() {
	const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
	const readinessPlanMock = jest.fn(
		(keys: ReadinessPlan['keys']) =>
			({ keys, run: readinessRun }) as ReadinessPlan
	);
	const readinessDescriptors = [
		{
			key: 'composer',
			metadata: { label: 'Composer dependencies', scopes: ['apply'] },
		},
		{
			key: 'tsx-runtime',
			metadata: { label: 'TSX runtime', scopes: ['apply'] },
		},
	] satisfies ReadinessHelperDescriptor[];
	const readinessRegistry = {
		plan: readinessPlanMock,
		describe: jest.fn(() => readinessDescriptors),
	} as unknown as ReadinessRegistry;

	return {
		readinessRun,
		readinessPlanMock,
		buildReadinessRegistry: jest.fn(() => readinessRegistry),
		readinessDescriptors,
	};
}

describe('ApplyCommand error handling', () => {
	it('maps validation wpk errors to validation exit code', async () => {
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
			const readiness = createReadinessRegistryStub();

			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				createPatcher,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'failed',
					exitCode: WPK_EXIT_CODES.VALIDATION_ERROR,
				})
			);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});
});
