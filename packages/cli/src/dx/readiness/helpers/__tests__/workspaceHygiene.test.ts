import { createReporter } from '@wpkernel/core/reporter';
import { createWorkspaceHygieneReadinessHelper } from '../workspaceHygiene';
import type { DxContext } from '../../../context';
import type { Workspace } from '../../../../workspace';

describe('createWorkspaceHygieneReadinessHelper', () => {
	function buildContext(workspace: Workspace | null): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx.workspace',
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

	it('blocks detection without workspace', async () => {
		const helper = createWorkspaceHygieneReadinessHelper({
			ensureClean: jest.fn(),
		});
		const detection = await helper.detect(buildContext(null));
		expect(detection.status).toBe('blocked');
	});

	it('detects clean workspace', async () => {
		const ensureClean = jest.fn().mockResolvedValue(undefined);
		const workspace = { root: '/tmp/project' } as Workspace;
		const helper = createWorkspaceHygieneReadinessHelper({ ensureClean });

		const context = buildContext(workspace);
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(ensureClean).toHaveBeenCalled();

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('flags dirty workspace', async () => {
		const ensureClean = jest.fn().mockRejectedValue(new Error('dirty'));
		const workspace = { root: '/tmp/project' } as Workspace;
		const helper = createWorkspaceHygieneReadinessHelper({ ensureClean });

		const detection = await helper.detect(buildContext(workspace));
		expect(detection.status).toBe('blocked');
	});
});
