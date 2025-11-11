import { createWorkspaceHygieneReadinessHelper } from '../workspaceHygiene';
import {
	createReadinessTestContext,
	createWorkspaceDouble,
} from '../../test/test-support';

describe('createWorkspaceHygieneReadinessHelper', () => {
	it('blocks detection without workspace', async () => {
		const helper = createWorkspaceHygieneReadinessHelper({
			ensureClean: jest.fn(),
		});
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('blocked');
	});

	it('detects clean workspace', async () => {
		const ensureClean = jest.fn().mockResolvedValue(undefined);
		const workspace = createWorkspaceDouble();
		const helper = createWorkspaceHygieneReadinessHelper({ ensureClean });

		const context = createReadinessTestContext({ workspace });
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(ensureClean).toHaveBeenCalled();

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('flags dirty workspace', async () => {
		const ensureClean = jest.fn().mockRejectedValue(new Error('dirty'));
		const workspace = createWorkspaceDouble();
		const helper = createWorkspaceHygieneReadinessHelper({ ensureClean });

		const detection = await helper.detect(
			createReadinessTestContext({ workspace })
		);
		expect(detection.status).toBe('blocked');
	});
});
