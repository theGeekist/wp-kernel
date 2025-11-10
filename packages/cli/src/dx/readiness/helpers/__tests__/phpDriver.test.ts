import { createReporter } from '@wpkernel/core/reporter';
import { createPhpDriverReadinessHelper } from '../phpDriver';
import type { DxContext } from '../../../context';

describe('createPhpDriverReadinessHelper', () => {
	function buildContext(): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx.driver',
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

	it('reports ready when assets exist', async () => {
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/node_modules/@wpkernel/php-driver/package.json'
			);
		const access = jest.fn().mockResolvedValue(undefined);
		const helper = createPhpDriverReadinessHelper({ resolve, access });

		const detection = await helper.detect(buildContext());
		expect(detection.status).toBe('ready');
		expect(resolve).toHaveBeenCalled();

		const confirmation = await helper.confirm(
			buildContext(),
			detection.state
		);
		expect(confirmation.status).toBe('ready');
	});

	it('reports pending when assets are missing', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('not found');
		});
		const helper = createPhpDriverReadinessHelper({
			resolve,
			access: jest.fn(),
		});

		const detection = await helper.detect(buildContext());
		expect(detection.status).toBe('pending');
	});
});
