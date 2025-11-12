import path from 'node:path';
import { type EnvironmentalError } from '@wpkernel/core/error';
import { createPhpPrinterPathReadinessHelper } from '../phpPrinterPath';
import { createReadinessTestContext } from '../../test/test-support';

const DRIVER_PACKAGE_JSON =
	'/tmp/node_modules/@wpkernel/php-driver/package.json';
const PRINTER_PATH = `${path.dirname(DRIVER_PACKAGE_JSON)}/php/pretty-print.php`;

describe('createPhpPrinterPathReadinessHelper', () => {
	it('reports ready when runtime and module paths align', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockReturnValue(PRINTER_PATH);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockImplementation(async (value) => value);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe(
			'PHP printer path matches runtime resolver.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe('PHP printer path verified.');
	});

	it('reports pending when runtime path is missing', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockReturnValue(PRINTER_PATH);
		const access = jest.fn().mockImplementation(async (value) => {
			if (value === PRINTER_PATH) {
				throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
			}

			return undefined;
		});
		const realpath = jest.fn();

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe('PHP printer runtime path missing.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'PHP printer path verification pending.'
		);
	});

	it('reports pending when runtime resolver throws', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockImplementation(() => {
			throw new Error('resolver failed');
		});
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockImplementation(async (value) => value);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe('PHP printer runtime path missing.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
	});

	it('reports pending when runtime resolver returns empty path', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockReturnValue('');
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockImplementation(async (value) => value);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe('PHP printer runtime path missing.');
	});

	it('reports pending when module path cannot be resolved', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('module not found');
		});
		const resolveRuntimePath = jest.fn().mockReturnValue(PRINTER_PATH);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockImplementation(async (value) => value);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'PHP printer asset missing from module resolution.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'PHP printer path verification pending.'
		);
	});

	it('returns ready when realpath lookups fall back to resolved paths', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockReturnValue(PRINTER_PATH);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockImplementation(async () => {
			throw new Error('realpath unavailable');
		});

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('ready');
		expect(detection.message).toBe(
			'PHP printer path matches runtime resolver.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('reports pending when canonical paths cannot be determined', async () => {
		const resolve = jest.fn().mockReturnValue(DRIVER_PACKAGE_JSON);
		const resolveRuntimePath = jest.fn().mockReturnValue(PRINTER_PATH);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockResolvedValue(null as unknown as string);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });
		const detection = await helper.detect(context);

		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'PHP printer path verification pending.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
	});

	it('throws EnvironmentalError when paths differ', async () => {
		const runtimePath =
			'/tmp/node_modules/@wpkernel/php-driver/php/runtime/pretty-print.php';
		const modulePackageJson = '/tmp/dist/packages/php-driver/package.json';
		const resolvedModulePath = path.resolve(
			path.dirname(modulePackageJson),
			'php',
			'pretty-print.php'
		);
		const resolve = jest.fn().mockReturnValue(modulePackageJson);
		const resolveRuntimePath = jest.fn().mockReturnValue(runtimePath);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest
			.fn()
			.mockImplementation(async (value) =>
				value === runtimePath
					? runtimePath
					: `${resolvedModulePath}.alt`
			);

		const helper = createPhpPrinterPathReadinessHelper({
			resolve,
			resolveRuntimePath,
			access,
			realpath,
		});

		const context = createReadinessTestContext({ workspace: null });

		await expect(helper.detect(context)).rejects.toMatchObject({
			reason: 'php.printerPath.mismatch',
		} satisfies Partial<EnvironmentalError>);
	});
});
