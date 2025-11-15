import { deriveCacheKeys, createDefaultCacheKeySegments } from '../cache-keys';

describe('cache-keys utilities', () => {
	it('derives default cache key descriptors', () => {
		const cacheKeys = deriveCacheKeys('demo');

		expect(cacheKeys.list).toEqual({
			source: 'default',
			segments: ['demo', 'list', '{}'],
		});
		expect(cacheKeys.get).toEqual({
			source: 'default',
			segments: ['demo', 'get', '__wpk_id__'],
		});
		expect(cacheKeys.create).toBeUndefined();
		expect(cacheKeys.update).toBeUndefined();
		expect(cacheKeys.remove).toBeUndefined();
	});

	it('creates frozen default segments', () => {
		const defaults = createDefaultCacheKeySegments('demo');

		expect(Object.isFrozen(defaults.list)).toBe(true);
		expect(defaults.list).toEqual(['demo', 'list', '{}']);
	});
});
