import { EnvironmentalError } from '@wpkernel/core/error';
import { createPhpCodemodIngestionReadinessHelper } from '../phpCodemodIngestion';
import { createReadinessTestContext } from '../../test/test-support';

jest.mock('../../../../utils/phpAssets', () => ({
	resolveBundledPhpJsonAstIngestionPath: jest
		.fn()
		.mockReturnValue('/bundle/php-json-ast/php/ingest-program.php'),
}));

describe('createPhpCodemodIngestionReadinessHelper', () => {
	it('reports ready when the bundled script exists', async () => {
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest
			.fn()
			.mockResolvedValue('/bundle/php-json-ast/php/ingest-program.php');

		const helper = createPhpCodemodIngestionReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({});
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('PHP codemod ingestion path verified.');
		expect(access).toHaveBeenCalled();
		expect(realpath).toHaveBeenCalled();
	});

	it('reports pending when the script is missing', async () => {
		const access = jest.fn().mockRejectedValue(new Error('not found'));
		const realpath = jest.fn();

		const helper = createPhpCodemodIngestionReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({});
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'PHP codemod ingestion runtime path missing.'
		);
	});

	it('throws when the script exists but canonical path cannot be resolved', async () => {
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockResolvedValue(null);

		const helper = createPhpCodemodIngestionReadinessHelper({
			access,
			realpath,
		});

		const context = createReadinessTestContext({});
		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});
});
