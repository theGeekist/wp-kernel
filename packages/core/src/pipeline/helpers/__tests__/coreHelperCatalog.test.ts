import { buildCoreActionHelperCatalog } from '../actions/catalog';
import { buildCoreResourceHelperCatalog } from '../resources/catalog';

describe('core pipeline helper catalogues', () => {
	it('lists action helpers for every lifecycle responsibility', () => {
		const catalog = buildCoreActionHelperCatalog();
		const keys = catalog.map((entry) => entry.key);
		expect(new Set(keys).size).toBe(keys.length);
		expect(catalog.map((entry) => entry.responsibility)).toEqual([
			'options',
			'context',
			'lifecycle',
			'execution',
			'registry',
		]);
	});

	it('lists resource helpers for every lifecycle responsibility', () => {
		const catalog = buildCoreResourceHelperCatalog();
		const keys = catalog.map((entry) => entry.key);
		expect(new Set(keys).size).toBe(keys.length);
		expect(catalog.map((entry) => entry.responsibility)).toEqual([
			'namespace',
			'reporter',
			'validation',
			'client',
			'cache-keys',
			'grouped-api',
			'builder',
			'registry',
		]);
	});
});
