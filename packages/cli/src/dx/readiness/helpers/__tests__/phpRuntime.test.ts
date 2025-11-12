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
		expect(detection.message).toBe('PHP binary not available on PATH.');

		const confirmation = await helper.confirm(
			createReadinessTestContext({ workspace: null }),
			detection.state
		);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe('PHP binary still missing.');
	});

	it('handles unknown version output gracefully', async () => {
		const helper = createPhpRuntimeReadinessHelper({
			exec: jest.fn().mockResolvedValue({ stdout: '' }),
		});
		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.message).toBe('PHP detected (unknown).');
		expect(detection.state.version).toBe('unknown');
	});
});
