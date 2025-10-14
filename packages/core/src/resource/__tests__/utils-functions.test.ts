/**
 * Tests for resource utility functions
 *
 * Tests createDefaultCacheKeys and getWPData helper functions
 */

import { createDefaultCacheKeys } from '../utils';

describe('resource utilities', () => {
	describe('createDefaultCacheKeys', () => {
		it('should generate list cache key with query', () => {
			const keys = createDefaultCacheKeys('thing');
			const listKey = keys.list({ q: 'search', page: 2 });

			expect(listKey).toEqual([
				'thing',
				'list',
				JSON.stringify({ q: 'search', page: 2 }),
			]);
		});

		it('should generate list cache key with empty query', () => {
			const keys = createDefaultCacheKeys('thing');
			const listKey = keys.list();

			expect(listKey).toEqual(['thing', 'list', JSON.stringify({})]);
		});

		it('should generate get cache key', () => {
			const keys = createDefaultCacheKeys('thing');
			const getKey = keys.get(123);

			expect(getKey).toEqual(['thing', 'get', 123]);
		});

		it('should generate get cache key with string ID', () => {
			const keys = createDefaultCacheKeys('thing');
			const getKey = keys.get('abc-123');

			expect(getKey).toEqual(['thing', 'get', 'abc-123']);
		});

		it('should generate create cache key with data', () => {
			const keys = createDefaultCacheKeys('thing');
			const createKey = keys.create({ title: 'New Thing' });

			expect(createKey).toEqual([
				'thing',
				'create',
				JSON.stringify({ title: 'New Thing' }),
			]);
		});

		it('should generate create cache key with empty data', () => {
			const keys = createDefaultCacheKeys('thing');
			const createKey = keys.create();

			expect(createKey).toEqual(['thing', 'create', JSON.stringify({})]);
		});

		it('should generate update cache key', () => {
			const keys = createDefaultCacheKeys('thing');
			const updateKey = keys.update(456);

			expect(updateKey).toEqual(['thing', 'update', 456]);
		});

		it('should generate remove cache key', () => {
			const keys = createDefaultCacheKeys('thing');
			const removeKey = keys.remove(789);

			expect(removeKey).toEqual(['thing', 'remove', 789]);
		});

		it('should use resource name in all cache keys', () => {
			const keys = createDefaultCacheKeys('custom-resource');

			expect(keys.list()[0]).toBe('custom-resource');
			expect(keys.get(1)[0]).toBe('custom-resource');
			expect(keys.create()[0]).toBe('custom-resource');
			expect(keys.update(1)[0]).toBe('custom-resource');
			expect(keys.remove(1)[0]).toBe('custom-resource');
		});
	});
});
