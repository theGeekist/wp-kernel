import { createComposerReadinessHelper } from '../composer';
import { resolveBundledComposerAutoloadPath } from '../../../../utils/phpAssets';
import { createReadinessTestContext } from '@cli-tests/readiness.test-support';
import type { MockFs } from '@cli-tests/mocks';
import { resetPhpAssetsMock } from '@cli-tests/mocks';

jest.mock('node:fs/promises', () => {
	const { createMockFs } = jest.requireActual('@cli-tests/mocks');
	return createMockFs();
});
jest.mock('../../../../utils/phpAssets', () => {
	const { phpAssetsMock } = jest.requireActual('@cli-tests/mocks/php-assets');
	return phpAssetsMock;
});

const mockFs = jest.requireMock('node:fs/promises') as MockFs;
const resolveAutoloadMock =
	resolveBundledComposerAutoloadPath as jest.MockedFunction<
		typeof resolveBundledComposerAutoloadPath
	>;

function createHelper(
	overrides: Parameters<typeof createComposerReadinessHelper>[0] = {}
) {
	const helper = createComposerReadinessHelper({
		pathExists: mockFs.exists,
		...overrides,
	});

	return {
		helper,
		pathExists: mockFs.exists,
	};
}

describe('createComposerReadinessHelper', () => {
	beforeEach(() => {
		resetPhpAssetsMock();
		mockFs.files.clear();
		mockFs.exists.mockClear();
		// Set a default behavior for exists so tests don't have to mock everything
		mockFs.exists.mockResolvedValue(true);
	});

	it('returns ready when the CLI bundle contains the composer autoload', async () => {
		const autoloadPath = resolveBundledComposerAutoloadPath();
		mockFs.exists.mockImplementation(
			async (candidate) => candidate === autoloadPath
		);

		const { helper } = createHelper();

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('Bundled composer autoload detected.');
		expect(detection.state.autoloadPath).toBe(autoloadPath);
		expect(detection.state.sourcePackage).toBe('@wpkernel/php-json-ast');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe('Bundled composer autoload ready.');
	});

	it('reports pending when the CLI bundle autoload is missing', async () => {
		mockFs.exists.mockResolvedValue(false);

		const { helper, pathExists } = createHelper();
		const context = createReadinessTestContext({ workspace: null });

		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(pathExists).toHaveBeenCalledWith(
			resolveBundledComposerAutoloadPath()
		);
	});

	it('returns pending when no bundled autoload is available', async () => {
		resolveAutoloadMock.mockReturnValueOnce(undefined as unknown as string);
		const { helper } = createHelper();
		const context = createReadinessTestContext({ workspace: null });

		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'Bundled composer autoload missing from PHP assets package.'
		);
		expect(detection.state.autoloadPath).toBeNull();
	});
});
