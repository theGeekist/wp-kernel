import { createPhpNamespace } from '../php';

describe('createPhpNamespace', () => {
	it('returns default namespace when empty', () => {
		expect(createPhpNamespace('')).toBe('WPKernel');
	});

	it('capitalises multi-segment namespaces', () => {
		expect(createPhpNamespace('demo-plugin-feature')).toBe(
			'Demo\\Plugin\\Feature'
		);
	});

	it('preserves WP acronym segments', () => {
		expect(createPhpNamespace('wp-awesome')).toBe('WP\\Awesome');
	});

	it('formats single segment slugs', () => {
		expect(createPhpNamespace('solo')).toBe('Solo');
	});
});
