import type { PhpProgram } from '@wpkernel/php-json-ast';

import { buildPluginLoaderProgram } from '../loader';

describe('buildPluginLoaderProgram', () => {
	it('emits plugin loader with controller registrations', () => {
		const program = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			resourceClassNames: [
				'Demo\\Plugin\\Generated\\Rest\\BooksController',
				'Demo\\Plugin\\Generated\\Rest\\AuthorsController',
			],
		});

		expect(program).toMatchSnapshot('plugin-loader-program');
	});

	it('handles projects without resources', () => {
		const program: PhpProgram = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'JobsPlugin',
			sanitizedNamespace: 'jobs-plugin',
			resourceClassNames: [],
		});

		expect(program).toMatchSnapshot('plugin-loader-program-empty');
	});
});
