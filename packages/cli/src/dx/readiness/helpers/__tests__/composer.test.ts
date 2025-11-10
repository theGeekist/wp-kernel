import { createReporter } from '@wpkernel/core/reporter';
import { createComposerReadinessHelper } from '../composer';
import type { DxContext } from '../../../context';
import type { Workspace } from '../../../../workspace';

describe('createComposerReadinessHelper', () => {
	function buildContext(workspace: Workspace | null): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx.composer',
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

	it('blocks detection when workspace is unavailable', async () => {
		const helper = createComposerReadinessHelper({ install: jest.fn() });
		const detection = await helper.detect(buildContext(null));
		expect(detection.status).toBe('blocked');
	});

	it('installs composer dependencies when autoload is missing', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const rm = jest.fn();
		const workspace: Workspace = {
			root: '/tmp/project',
			exists,
			rm,
			resolve: (...parts: string[]) =>
				['/tmp/project', ...parts].join('/'),
			read: jest.fn(),
			readText: jest.fn(),
			write: jest.fn(),
			writeJson: jest.fn(),
			glob: jest.fn(),
			threeWayMerge: jest.fn(),
			begin: jest.fn(),
			commit: jest.fn(),
			rollback: jest.fn(),
			dryRun: jest.fn(),
			tmpDir: jest.fn(),
			cwd: () => '/tmp/project',
		} as unknown as Workspace;
		const install = jest.fn().mockResolvedValue(undefined);
		const helper = createComposerReadinessHelper({ install });

		const context = buildContext(workspace);
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await helper.execute?.(context, detection.state);
		expect(install).toHaveBeenCalledWith('/tmp/project');

		// simulate composer autoload after install
		exists.mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		});

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(rm).not.toHaveBeenCalled();
	});

	it('removes vendor directory on cleanup when install introduced it', async () => {
		const exists = jest.fn().mockImplementation((file: string) => {
			if (file === 'composer.json') {
				return Promise.resolve(true);
			}
			if (file === 'vendor/autoload.php') {
				return Promise.resolve(false);
			}
			return Promise.resolve(false);
		});
		const rm = jest.fn().mockResolvedValue(undefined);
		const workspace: Workspace = {
			root: '/tmp/project',
			exists,
			rm,
			resolve: (...parts: string[]) =>
				['/tmp/project', ...parts].join('/'),
			read: jest.fn(),
			readText: jest.fn(),
			write: jest.fn(),
			writeJson: jest.fn(),
			glob: jest.fn(),
			threeWayMerge: jest.fn(),
			begin: jest.fn(),
			commit: jest.fn(),
			rollback: jest.fn(),
			dryRun: jest.fn(),
			tmpDir: jest.fn(),
			cwd: () => '/tmp/project',
		} as unknown as Workspace;
		const install = jest.fn().mockResolvedValue(undefined);
		const helper = createComposerReadinessHelper({ install });

		const context = buildContext(workspace);
		const detection = await helper.detect(context);
		const result = await helper.execute?.(context, detection.state);
		await result?.cleanup?.();

		expect(rm).toHaveBeenCalledWith('vendor', { recursive: true });
	});
});
