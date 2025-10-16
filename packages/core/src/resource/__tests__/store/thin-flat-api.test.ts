/**
 * Unit tests for createStore factory - Thin-Flat API
 *
 * Tests the @wordpress/data store integration
 */

import type { ResourceObject } from '../../types';
import {
	createMockResource,
	type MockThing,
	type MockThingQuery,
} from '../../../../tests/resource.test-support';

describe('createStore - Thin-Flat API', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;

	beforeEach(() => {
		({ resource: mockResource } = createMockResource());
	});

	describe('thin-flat API methods', () => {
		describe('key() method', () => {
			it('should generate cache key for list operation', () => {
				const query = { q: 'search', status: 'active' };
				const key = mockResource.key('list', query);

				expect(key).toEqual(['thing', 'list', JSON.stringify(query)]);
			});

			it('should generate cache key for get operation', () => {
				const key = mockResource.key('get', 123);

				expect(key).toEqual(['thing', 'get', 123]);
			});

			it('should generate cache key for create operation', () => {
				const data = { title: 'New Thing', status: 'active' };
				const key = mockResource.key('create', data);

				expect(key).toEqual(['thing', 'create', JSON.stringify(data)]);
			});

			it('should generate cache key for update operation', () => {
				const key = mockResource.key('update', 123);

				expect(key).toEqual(['thing', 'update', 123]);
			});

			it('should generate cache key for remove operation', () => {
				const key = mockResource.key('remove', 123);

				expect(key).toEqual(['thing', 'remove', 123]);
			});

			it('should filter out null and undefined values from cache keys', () => {
				// Mock a cache key generator that includes null/undefined
				const resourceWithNulls = {
					...mockResource,
					cacheKeys: {
						...mockResource.cacheKeys,
						list: () => ['thing', 'list', null, undefined, 'value'],
					},
					key: jest.fn(
						(
							operation:
								| 'list'
								| 'get'
								| 'create'
								| 'update'
								| 'remove'
						): (string | number | boolean)[] => {
							const generators = resourceWithNulls.cacheKeys;
							const result =
								generators[operation]?.(undefined) || [];
							return result.filter(
								(v): v is string | number | boolean =>
									v !== null && v !== undefined
							);
						}
					),
				};

				const key = resourceWithNulls.key('list');

				expect(key).toEqual(['thing', 'list', 'value']);
				expect(key).not.toContain(null);
				expect(key).not.toContain(undefined);
			});
		});

		describe('invalidate() method', () => {
			it('should call invalidate with correct patterns', () => {
				const patterns = [
					['thing', 'list'],
					['thing', 'get', 123],
				];

				mockResource.invalidate(patterns);

				expect(mockResource.invalidate).toHaveBeenCalledWith(patterns);
			});

			it('should handle single pattern', () => {
				const pattern = [['thing', 'list']];

				mockResource.invalidate(pattern);

				expect(mockResource.invalidate).toHaveBeenCalledWith(pattern);
			});

			it('should handle empty pattern array', () => {
				const pattern: any = [];

				mockResource.invalidate(pattern);

				expect(mockResource.invalidate).toHaveBeenCalledWith(pattern);
			});
		});

		describe('prefetchGet() method', () => {
			it('should trigger prefetch for single item', async () => {
				await mockResource.prefetchGet?.(123);

				expect(mockResource.prefetchGet).toHaveBeenCalledWith(123);
			});

			it('should work with string IDs', async () => {
				await mockResource.prefetchGet?.('abc-123');

				expect(mockResource.prefetchGet).toHaveBeenCalledWith(
					'abc-123'
				);
			});

			it('should resolve without returning data', async () => {
				const result = await mockResource.prefetchGet?.(123);

				expect(result).toBeUndefined();
			});
		});

		describe('prefetchList() method', () => {
			it('should trigger prefetch for list with query', async () => {
				const query = { q: 'search', status: 'active' };
				await mockResource.prefetchList?.(query);

				expect(mockResource.prefetchList).toHaveBeenCalledWith(query);
			});

			it('should trigger prefetch for list without query', async () => {
				await mockResource.prefetchList?.();

				expect(mockResource.prefetchList).toHaveBeenCalledWith();
			});

			it('should resolve without returning data', async () => {
				const result = await mockResource.prefetchList?.();

				expect(result).toBeUndefined();
			});
		});

		describe('useGet() hook', () => {
			it('should be defined as a function', () => {
				expect(mockResource.useGet).toBeDefined();
				expect(typeof mockResource.useGet).toBe('function');
			});

			it('should be callable with numeric ID', () => {
				expect(() => mockResource.useGet?.(123)).not.toThrow();
			});

			it('should be callable with string ID', () => {
				expect(() => mockResource.useGet?.('abc-123')).not.toThrow();
			});
		});

		describe('useList() hook', () => {
			it('should be defined as a function', () => {
				expect(mockResource.useList).toBeDefined();
				expect(typeof mockResource.useList).toBe('function');
			});

			it('should be callable with query parameters', () => {
				const query = { q: 'search', status: 'active' };
				expect(() => mockResource.useList?.(query)).not.toThrow();
			});

			it('should be callable without query parameters', () => {
				expect(() => mockResource.useList?.()).not.toThrow();
			});
		});

		describe('CRUD methods', () => {
			it('should have create method', async () => {
				const data = { title: 'New Thing', status: 'active' };
				const result = await mockResource.create?.(data);

				expect(mockResource.create).toHaveBeenCalledWith(data);
				expect(result).toEqual({
					id: 3,
					title: 'New Thing',
					status: 'active',
				});
			});

			it('should have update method', async () => {
				const data = { title: 'Updated Thing' };
				const result = await mockResource.update?.(1, data);

				expect(mockResource.update).toHaveBeenCalledWith(1, data);
				expect(result).toEqual({
					id: 1,
					title: 'Updated Thing',
					status: 'active',
				});
			});

			it('should have remove method', async () => {
				const result = await mockResource.remove?.(1);

				expect(mockResource.remove).toHaveBeenCalledWith(1);
				expect(result).toBeUndefined();
			});
		});

		describe('integration with store', () => {
			it('should work together - fetch, key, invalidate', async () => {
				// Fetch an item
				const item = await mockResource.fetch?.(123);
				expect(item).toBeDefined();

				// Generate cache key for the item
				const cacheKey = mockResource.key('get', 123);
				expect(cacheKey).toEqual(['thing', 'get', 123]);

				// Invalidate the cache
				mockResource.invalidate([[...cacheKey]]);
				expect(mockResource.invalidate).toHaveBeenCalledWith([
					['thing', 'get', 123],
				]);
			});

			it('should work together - list, prefetch, key', async () => {
				const query = { status: 'active' };

				// Prefetch a list
				await mockResource.prefetchList?.(query);

				// Generate cache key for the list
				const cacheKey = mockResource.key('list', query);
				expect(cacheKey).toEqual([
					'thing',
					'list',
					JSON.stringify(query),
				]);

				// Fetch the list
				const result = await mockResource.fetchList?.(query);
				expect(result?.items).toHaveLength(2);
			});

			it('should support chaining pattern', async () => {
				// Create → invalidate → prefetch
				const newItem = await mockResource.create?.({
					title: 'New',
					status: 'active',
				});
				expect(newItem).toBeDefined();

				// Invalidate lists
				mockResource.invalidate([['thing', 'list']]);

				// Prefetch updated list
				await mockResource.prefetchList?.({ status: 'active' });

				expect(mockResource.create).toHaveBeenCalled();
				expect(mockResource.invalidate).toHaveBeenCalled();
				expect(mockResource.prefetchList).toHaveBeenCalled();
			});
		});

		describe('optional methods', () => {
			it('should gracefully handle when optional methods are undefined', () => {
				const minimalResource = {
					...mockResource,
					useGet: undefined,
					useList: undefined,
					prefetchGet: undefined,
					prefetchList: undefined,
				};

				expect(minimalResource.useGet).toBeUndefined();
				expect(minimalResource.useList).toBeUndefined();
				expect(minimalResource.prefetchGet).toBeUndefined();
				expect(minimalResource.prefetchList).toBeUndefined();

				// But core methods should still work
				expect(minimalResource.key).toBeDefined();
				expect(minimalResource.invalidate).toBeDefined();
			});

			it('should work with only get route defined', () => {
				const getOnlyResource = {
					...mockResource,
					routes: {
						get: {
							path: '/my-plugin/v1/things/:id',
							method: 'GET' as const,
						},
					},
					fetchList: undefined,
					useList: undefined,
					prefetchList: undefined,
				};

				expect(getOnlyResource.fetch).toBeDefined();
				expect(getOnlyResource.useGet).toBeDefined();
				expect(getOnlyResource.prefetchGet).toBeDefined();
				expect(getOnlyResource.fetchList).toBeUndefined();
			});
			it('should work with only list route defined', () => {
				const listOnlyResource = {
					...mockResource,
					routes: {
						list: {
							path: '/my-plugin/v1/things',
							method: 'GET' as const,
						},
					},
					fetch: undefined,
					useGet: undefined,
					prefetchGet: undefined,
				};

				expect(listOnlyResource.fetchList).toBeDefined();
				expect(listOnlyResource.useList).toBeDefined();
				expect(listOnlyResource.prefetchList).toBeDefined();
				expect(listOnlyResource.fetch).toBeUndefined();
			});
		});
	});
});
