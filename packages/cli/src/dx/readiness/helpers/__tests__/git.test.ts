import { createGitReadinessHelper } from '../git';
import { createReadinessTestContext } from '@cli-tests/readiness.test-support';
import {
	createGitDepsMock,
	type GitDepsMock,
} from '@cli-tests/dx/git.test-support';

describe('createGitReadinessHelper', () => {
	let deps: GitDepsMock;

	beforeEach(() => {
		deps = createGitDepsMock();
	});

	it('detects an existing git repository', async () => {
		deps.detectRepository.mockResolvedValue(true);
		const helper = createGitReadinessHelper({
			detectRepository: deps.detectRepository,
		});

		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);

		expect(deps.detectRepository).toHaveBeenCalledWith('/tmp/project');
		expect(detection.status).toBe('ready');
	});

	it('initialises git when repository is missing', async () => {
		deps.detectRepository
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		deps.initRepository.mockResolvedValue(undefined);
		const helper = createGitReadinessHelper({
			detectRepository: deps.detectRepository,
			initRepository: deps.initRepository,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await helper.execute?.(context, detection.state);
		expect(deps.initRepository).toHaveBeenCalledWith('/tmp/project');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});
});
