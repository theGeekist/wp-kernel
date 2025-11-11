import { createPhpDriverReadinessHelper } from '../phpDriver';
import { createReadinessTestContext } from '../../test/test-support';

describe('createPhpDriverReadinessHelper', () => {
	it('reports ready when assets exist', async () => {
		const resolve = jest
			.fn()
			.mockReturnValue(
				'/tmp/node_modules/@wpkernel/php-driver/package.json'
			);
		const access = jest.fn().mockResolvedValue(undefined);
		const helper = createPhpDriverReadinessHelper({ resolve, access });

		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('ready');
		expect(resolve).toHaveBeenCalled();

		const confirmation = await helper.confirm(
			createReadinessTestContext({ workspace: null }),
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

		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('pending');
	});
});
