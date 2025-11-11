import { createGitReadinessHelper } from '../git';
import { createReadinessTestContext } from '../../test/test-support';

describe('createGitReadinessHelper', () => {
	it('detects an existing git repository', async () => {
		const detectRepository = jest.fn().mockResolvedValue(true);
		const helper = createGitReadinessHelper({ detectRepository });

		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);

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

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await helper.execute?.(context, detection.state);
		expect(initRepository).toHaveBeenCalledWith('/tmp/project');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});
});
