import { createTsxRuntimeReadinessHelper } from '../tsxRuntime';
import {
	createReadinessTestContext,
	createWorkspaceDouble,
} from '../../test/test-support';

describe('createTsxRuntimeReadinessHelper', () => {
	it('detects existing tsx runtime', async () => {
		const helper = createTsxRuntimeReadinessHelper({
			resolve: jest.fn().mockReturnValue('/tmp/node_modules/tsx'),
			exec: jest.fn(),
		});
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('ready');
	});

	it('installs tsx when missing', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('missing');
		});
		const exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
		const workspace = createWorkspaceDouble();
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		const result = await helper.execute?.(context, detection.state);
		expect(exec).toHaveBeenCalledWith(
			'npm',
			['install', '--save-dev', 'tsx'],
			{
				cwd: '/tmp/project',
			}
		);

		await result?.cleanup?.();
		expect(exec).toHaveBeenCalledWith(
			'npm',
			['uninstall', '--save-dev', 'tsx'],
			{
				cwd: '/tmp/project',
			}
		);
	});
});
