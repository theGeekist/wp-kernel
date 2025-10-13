jest.mock(
	'vite',
	() => ({
		defineConfig: (config: unknown) => config,
	}),
	{ virtual: true }
);

jest.mock(
	'vite-plugin-dts',
	() => ({
		__esModule: true,
		default: () => ({ name: 'mock-dts' }),
	}),
	{ virtual: true }
);

jest.mock(
	'@kucrut/vite-for-wp/utils',
	() => ({
		wp_globals: () => ({ 'wp-core': 'wp' }),
	}),
	{ virtual: true }
);

import config from '../../vite.config';

describe('CLI bundler configuration', () => {
	it('externalises runtime-only dependencies', () => {
		const external = config.build?.rollupOptions?.external;
		expect(Array.isArray(external)).toBe(true);
		expect(external).toEqual(
			expect.arrayContaining([
				'chokidar',
				'clipanion',
				'cosmiconfig',
				'typanion',
			])
		);
	});
});
