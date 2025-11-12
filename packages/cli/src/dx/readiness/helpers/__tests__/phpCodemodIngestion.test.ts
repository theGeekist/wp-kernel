import { EnvironmentalError } from '@wpkernel/core/error';
import { createPhpCodemodIngestionReadinessHelper } from '../phpCodemodIngestion';
import {
	createReadinessTestContext,
	makeNoEntry,
} from '../../test/test-support';

const runtimePath =
	'/repo/node_modules/@wpkernel/php-json-ast/php/ingest-program.php';
const modulePath =
	'/repo/node_modules/@wpkernel/php-json-ast/php/ingest-program.php';

describe('createPhpCodemodIngestionReadinessHelper', () => {
	it('reports ready when runtime and module paths align', async () => {
		const resolve = jest.fn(() => modulePath);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest
			.fn()
			.mockResolvedValue(
				'/repo/node_modules/@wpkernel/php-json-ast/php/ingest-program.php'
			);
		const helper = createPhpCodemodIngestionReadinessHelper({
			resolve,
			access,
			realpath,
			resolveRuntimePath: () => runtimePath,
		});
		const context = createReadinessTestContext({});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toBe(
			'PHP codemod ingestion path matches runtime resolver.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe(
			'PHP codemod ingestion path verified.'
		);
	});

	it('reports pending when runtime path is missing', async () => {
		const resolve = jest.fn(() => modulePath);
		const access = jest.fn().mockImplementation((target: string) => {
			if (target === runtimePath) {
				throw makeNoEntry(target);
			}

			return Promise.resolve();
		});
		const realpath = jest.fn().mockResolvedValue(modulePath);

		const helper = createPhpCodemodIngestionReadinessHelper({
			resolve,
			access,
			realpath,
			resolveRuntimePath: () => runtimePath,
		});
		const context = createReadinessTestContext({});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'PHP codemod ingestion runtime path missing.'
		);
	});

	it('reports pending when module resolution is missing', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('not found');
		});
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest.fn().mockResolvedValue(runtimePath);

		const helper = createPhpCodemodIngestionReadinessHelper({
			resolve,
			access,
			realpath,
			resolveRuntimePath: () => runtimePath,
		});
		const context = createReadinessTestContext({});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'PHP codemod ingestion asset missing from module resolution.'
		);
	});

	it('throws when runtime and module paths differ', async () => {
		const mismatchedModulePath =
			'/repo/node_modules_alt/@wpkernel/php-json-ast/php/ingest-program.php';
		const resolve = jest.fn(() => mismatchedModulePath);
		const access = jest.fn().mockResolvedValue(undefined);
		const realpath = jest
			.fn()
			.mockImplementation((target: string) =>
				target === runtimePath
					? runtimePath
					: `${mismatchedModulePath}.alt`
			);

		const helper = createPhpCodemodIngestionReadinessHelper({
			resolve,
			access,
			realpath,
			resolveRuntimePath: () => runtimePath,
		});
		const context = createReadinessTestContext({});

		await expect(helper.detect(context)).rejects.toThrow(
			EnvironmentalError
		);
	});
});
