import { createPhpRuntimeReadinessHelper } from '../phpRuntime';
import { createReadinessTestContext } from '../../test/test-support';

describe('createPhpRuntimeReadinessHelper', () => {
	it('detects php binary availability', async () => {
		const helper = createPhpRuntimeReadinessHelper({
			exec: jest.fn().mockResolvedValue({ stdout: 'PHP 8.1.0' }),
		});
		const context = createReadinessTestContext({ workspace: null });
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
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('blocked');
	});
});
