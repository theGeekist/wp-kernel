import type { PhpProgram } from '@wpkernel/php-json-ast';

import { buildPluginLoaderProgram } from '../loader';

describe('buildPluginLoaderProgram', () => {
	it('emits plugin loader with controller registrations', () => {
		const plugin = {
			name: 'Demo Plugin',
			description: 'Bootstrap loader for Demo Plugin.',
			version: '1.2.3',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'demo-plugin',
			author: 'Demo Author',
			authorUri: 'https://example.test/author',
			pluginUri: 'https://example.test/plugin',
			license: 'GPL-2.0-or-later',
			licenseUri: 'https://example.test/license',
		};

		const program = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			plugin,
			resourceClassNames: [
				'Demo\\Plugin\\Generated\\Rest\\BooksController',
				'Demo\\Plugin\\Generated\\Rest\\AuthorsController',
			],
		});

		expect(program).toMatchSnapshot('plugin-loader-program');
	});

	it('handles projects without resources', () => {
		const plugin = {
			name: 'Jobs Plugin',
			description: 'Bootstrap loader for Jobs Plugin.',
			version: '0.1.0',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'jobs-plugin',
			author: 'WPKernel Contributors',
			license: 'GPL-2.0-or-later',
		};

		const program: PhpProgram = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'JobsPlugin',
			sanitizedNamespace: 'jobs-plugin',
			plugin,
			resourceClassNames: [],
		});

		expect(program).toMatchSnapshot('plugin-loader-program-empty');
	});
});
