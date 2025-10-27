import { deriveCacheKeys, createDefaultCacheKeySegments } from '../cache-keys';
import type { CacheKeys } from '@wpkernel/core/resource';
import { KernelError } from '@wpkernel/core/error';

describe('cache-keys utilities', () => {
	it('derives default keys when functions not provided', () => {
		const cacheKeys = deriveCacheKeys(undefined, 'demo');

		expect(cacheKeys.list).toEqual({
			source: 'default',
			segments: expect.arrayContaining(['demo', 'list', '{}']),
		});
		expect(cacheKeys.get).toEqual({
			source: 'default',
			segments: expect.arrayContaining(['demo', 'get', '__wpk_id__']),
		});
	});

	it('throws when cache key function returns non-array', () => {
		const keys: CacheKeys<unknown> = {
			list: () => 'not-an-array' as unknown as unknown[],
			get: () => ['demo', 'get'],
		};

		expect(() => deriveCacheKeys(keys, 'demo')).toThrow(KernelError);
	});

	it('creates frozen default segments', () => {
		const defaults = createDefaultCacheKeySegments('demo');

		expect(Object.isFrozen(defaults.list)).toBe(true);
		expect(defaults.list).toEqual(['demo', 'list', '{}']);
	});
});
