import { createReporter } from '@wpkernel/core/reporter';
import { createTsxRuntimeReadinessHelper } from '../tsxRuntime';
import type { DxContext } from '../../../context';
import type { Workspace } from '../../../../workspace';

describe('createTsxRuntimeReadinessHelper', () => {
	function buildContext(workspace: Workspace | null): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx.tsx',
			level: 'debug',
			enabled: false,
		});

		return {
			reporter,
			workspace,
			environment: {
				cwd: '/tmp/project',
				projectRoot: '/repo/packages/cli',
				workspaceRoot: workspace ? workspace.root : null,
				flags: { forceSource: false },
			},
		} satisfies DxContext;
	}

	it('detects existing tsx runtime', async () => {
		const helper = createTsxRuntimeReadinessHelper({
			resolve: jest.fn().mockReturnValue('/tmp/node_modules/tsx'),
			exec: jest.fn(),
		});
		const detection = await helper.detect(buildContext(null));
		expect(detection.status).toBe('ready');
	});

	it('installs tsx when missing', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('missing');
		});
		const exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
		const workspace = { root: '/tmp/project' } as Workspace;
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });

		const context = buildContext(workspace);
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
