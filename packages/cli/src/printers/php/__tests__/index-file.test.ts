import path from 'node:path';
import type { PrinterContext } from '../../types';
import { createPhpIndexFile } from '../index-file';

const namespaceRoot = 'Demo\\Namespace';

describe('createPhpIndexFile', () => {
	it('builds a list of class paths with relative references', () => {
		const indexPath = path.resolve('/tmp', 'php', 'index.php');
		const baseControllerPath = path.resolve(
			'/tmp',
			'php',
			'Rest',
			'BaseController.php'
		);
		const persistencePath = path.resolve(
			'/tmp',
			'php',
			'Registration',
			'PersistenceRegistry.php'
		);

		const result = createPhpIndexFile({
			indexPath,
			namespaceRoot,
			baseControllerPath,
			resourceEntries: [
				{
					className: `${namespaceRoot}\\Rest\\JobController`,
					path: path.resolve(
						'/tmp',
						'php',
						'Rest',
						'JobController.php'
					),
				},
			],
			persistencePath,
			context: createPrinterContext(),
		});

		const formattedNamespace = namespaceRoot.replace(/\\/g, '\\\\');
		expect(result).toMatch(
			new RegExp(`'${formattedNamespace}\\\\Rest\\\\JobController'`)
		);
		expect(result).toMatch(
			new RegExp(
				`'${formattedNamespace}\\\\Registration\\\\PersistenceRegistry'`
			)
		);
		expect(result).toMatch(
			new RegExp(`'${formattedNamespace}\\\\Rest\\\\BaseController'`)
		);
	});
});

function createPrinterContext(): PrinterContext {
	return {
		ir: {
			meta: {
				origin: 'local-file.ts',
				namespace: 'DemoNamespace',
				sanitizedNamespace: 'DemoNamespace',
			},
			php: { namespace: namespaceRoot },
			schemas: [],
			resources: [],
			config: {},
		},
	} as unknown as PrinterContext;
}
