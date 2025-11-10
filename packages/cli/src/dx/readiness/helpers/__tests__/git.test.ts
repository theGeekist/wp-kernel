import { createReporter } from '@wpkernel/core/reporter';
import { createGitReadinessHelper } from '../git';
import type { DxContext } from '../../../context';

function buildContext(overrides: Partial<DxContext> = {}): DxContext {
	const reporter = createReporter({
		namespace: 'wpk.test.dx.git',
		level: 'debug',
		enabled: false,
	});

	return {
		reporter,
		workspace: null,
		environment: {
			cwd: '/tmp/project',
			projectRoot: '/repo/packages/cli',
			workspaceRoot: '/tmp/project',
			flags: { forceSource: false },
		},
		...overrides,
	} satisfies DxContext;
}

describe('createGitReadinessHelper', () => {
	it('detects an existing git repository', async () => {
		const detectRepository = jest.fn().mockResolvedValue(true);
		const helper = createGitReadinessHelper({ detectRepository });

		const detection = await helper.detect(buildContext());

		expect(detectRepository).toHaveBeenCalledWith('/tmp/project');
		expect(detection.status).toBe('ready');
	});

	it('initialises git when repository is missing', async () => {
		const detectRepository = jest
			.fn()
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const initRepository = jest.fn().mockResolvedValue(undefined);
		const helper = createGitReadinessHelper({
			detectRepository,
			initRepository,
		});

		const context = buildContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await helper.execute?.(context, detection.state);
		expect(initRepository).toHaveBeenCalledWith('/tmp/project');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});
});
