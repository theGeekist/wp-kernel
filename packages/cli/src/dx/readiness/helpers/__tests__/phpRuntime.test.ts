import { createReporter } from '@wpkernel/core/reporter';
import { createPhpRuntimeReadinessHelper } from '../phpRuntime';
import type { DxContext } from '../../../context';

describe('createPhpRuntimeReadinessHelper', () => {
	function buildContext(): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx.php',
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
		} satisfies DxContext;
	}

	it('detects php binary availability', async () => {
		const helper = createPhpRuntimeReadinessHelper({
			exec: jest.fn().mockResolvedValue({ stdout: 'PHP 8.1.0' }),
		});
		const context = buildContext();
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.state.version).toContain('PHP');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('flags missing php binary', async () => {
		const helper = createPhpRuntimeReadinessHelper({
			exec: jest.fn().mockRejectedValue(new Error('not found')),
		});
		const detection = await helper.detect(buildContext());
		expect(detection.status).toBe('blocked');
	});
});
