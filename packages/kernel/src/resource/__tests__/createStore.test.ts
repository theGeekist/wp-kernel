/**
 * Unit tests for createStore factory
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../store.js';
import type { ResourceObject, ListResponse } from '../types.js';
import { KernelError } from '../../error/index.js';

// Mock resource for testing
interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

describe('createStore', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;
	let mockListResponse: ListResponse<MockThing>;

	beforeEach(() => {
		mockListResponse = {
			items: [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			],
			total: 2,
			hasMore: false,
		};

		mockResource = {
			name: 'thing',
			storeKey: 'wpk/thing',
			cacheKeys: {
				list: (query) => ['thing', 'list', JSON.stringify(query || {})],
				get: (id) => ['thing', 'get', id],
				create: (data) => [
					'thing',
					'create',
					JSON.stringify(data || {}),
				],
				update: (id) => ['thing', 'update', id],
				remove: (id) => ['thing', 'remove', id],
			},
			routes: {
				list: { path: '/wpk/v1/things', method: 'GET' },
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
			list: jest.fn().mockResolvedValue(mockListResponse),
			get: jest.fn().mockResolvedValue({
				id: 1,
				title: 'Thing One',
				status: 'active',
			}),
			create: jest.fn().mockResolvedValue({
				id: 3,
				title: 'New Thing',
				status: 'active',
			}),
			update: jest.fn().mockResolvedValue({
				id: 1,
				title: 'Updated Thing',
				status: 'active',
			}),
			remove: jest.fn().mockResolvedValue(undefined),
			// Thin-flat API methods
			useGet: jest.fn(),
			useList: jest.fn(),
			prefetchGet: jest.fn().mockResolvedValue(undefined),
			prefetchList: jest.fn().mockResolvedValue(undefined),
			invalidate: jest.fn(),
			key: jest.fn(
				(
					operation: 'list' | 'get' | 'create' | 'update' | 'remove',
					params?: any
				): (string | number | boolean)[] => {
					const generators = mockResource.cacheKeys;
					const result = generators[operation]?.(params as any) || [];
					return result.filter(
						(v): v is string | number | boolean =>
							v !== null && v !== undefined
					);
				}
			),
			store: {},
		};
	});

	describe('store creation', () => {
		it('should create a store descriptor with correct structure', () => {
			const store = createStore({
				resource: mockResource,
			});

			expect(store).toHaveProperty('storeKey', 'wpk/thing');
			expect(store).toHaveProperty('reducer');
			expect(store).toHaveProperty('actions');
			expect(store).toHaveProperty('selectors');
			expect(store).toHaveProperty('resolvers');
			expect(store).toHaveProperty('initialState');
		});

		it('should use custom getId function when provided', () => {
			const customGetId = (item: MockThing) => `custom-${item.id}`;
			const store = createStore({
				resource: mockResource,
				getId: customGetId,
			});

			expect(store).toBeDefined();
			// getId is used internally in reducer, test via action
		});

		it('should use custom getQueryKey function when provided', () => {
			const customGetQueryKey = (query?: MockThingQuery) =>
				`custom-${JSON.stringify(query)}`;
			const store = createStore({
				resource: mockResource,
				getQueryKey: customGetQueryKey,
			});

			expect(store).toBeDefined();
		});

		it('should merge custom initial state', () => {
			const customInitialState = {
				items: { 99: { id: 99, title: 'Preset', status: 'active' } },
			};
			const store = createStore({
				resource: mockResource,
				initialState: customInitialState,
			});

			// Create initial state and check
			const state = store.reducer(undefined, { type: '@@INIT' });
			expect(state.items).toHaveProperty('99');
			expect(state.items[99]).toEqual({
				id: 99,
				title: 'Preset',
				status: 'active',
			});
		});
	});

	describe('reducer', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		it('should initialize with empty state', () => {
			const state = store.reducer(undefined, { type: '@@INIT' });

			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle RECEIVE_ITEM action', () => {
			const item: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};
			const action = {
				type: 'RECEIVE_ITEM',
				item,
			};

			const state = store.reducer(undefined, action);

			expect(state.items[1]).toEqual(item);
		});

		it('should handle RECEIVE_ITEMS action', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			];
			const queryKey = '{"q":"search"}';
			const meta = { total: 2, hasMore: false };
			const action = {
				type: 'RECEIVE_ITEMS',
				items,
				queryKey,
				meta,
			};

			const state = store.reducer(undefined, action);

			expect(state.items[1]).toEqual(items[0]);
			expect(state.items[2]).toEqual(items[1]);
			expect(state.lists[queryKey]).toEqual([1, 2]);
			expect(state.listMeta[queryKey]).toEqual(meta);
		});

		it('should handle RECEIVE_ERROR action', () => {
			const cacheKey = 'thing:get:1';
			const error = 'Not found';
			const action = {
				type: 'RECEIVE_ERROR',
				cacheKey,
				error,
			};

			const state = store.reducer(undefined, action);

			expect(state.errors[cacheKey]).toBe(error);
		});

		it('should handle INVALIDATE action', () => {
			// Setup state with data
			const setupAction1 = {
				type: 'RECEIVE_ITEMS',
				items: [{ id: 1, title: 'Thing One', status: 'active' }],
				queryKey: 'query1',
				meta: {},
			};
			const setupAction2 = {
				type: 'RECEIVE_ITEMS',
				items: [{ id: 2, title: 'Thing Two', status: 'inactive' }],
				queryKey: 'query2',
				meta: {},
			};
			let state = store.reducer(undefined, setupAction1);
			state = store.reducer(state, setupAction2);

			// Invalidate one query
			const invalidateAction = {
				type: 'INVALIDATE',
				cacheKeys: ['query1'],
			};
			state = store.reducer(state, invalidateAction);

			expect(state.lists).not.toHaveProperty('query1');
			expect(state.lists).toHaveProperty('query2');
		});

		it('should handle INVALIDATE_ALL action', () => {
			// Setup state with data
			const setupAction = {
				type: 'RECEIVE_ITEMS',
				items: [
					{ id: 1, title: 'Thing One', status: 'active' },
					{ id: 2, title: 'Thing Two', status: 'inactive' },
				],
				queryKey: 'query1',
				meta: {},
			};
			let state = store.reducer(undefined, setupAction);

			// Invalidate all
			const invalidateAllAction = {
				type: 'INVALIDATE_ALL',
			};
			state = store.reducer(state, invalidateAllAction);

			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle unknown action types gracefully', () => {
			const unknownAction = {
				type: 'UNKNOWN_ACTION',
				payload: 'test',
			};

			const state = store.reducer(undefined, unknownAction);

			// Should return initial state unchanged
			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});

		it('should handle invalid action objects gracefully', () => {
			// Intentionally pass invalid type to test error handling
			const invalidAction = 'not an object' as unknown as {
				type: string;
			};

			const state = store.reducer(undefined, invalidAction);

			// Should return initial state
			expect(state).toEqual({
				items: {},
				lists: {},
				listMeta: {},
				errors: {},
			});
		});
	});

	describe('actions', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		it('should create receiveItem action', () => {
			const item: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};
			const action = store.actions.receiveItem(item);

			expect(action).toEqual({
				type: 'RECEIVE_ITEM',
				item,
			});
		});

		it('should create receiveItems action', () => {
			const items: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const queryKey = 'query1';
			const meta = { total: 1, hasMore: false };

			const action = store.actions.receiveItems(queryKey, items, meta);

			expect(action).toEqual({
				type: 'RECEIVE_ITEMS',
				queryKey,
				items,
				meta,
			});
		});

		it('should create receiveError action', () => {
			const cacheKey = 'thing:get:1';
			const error = 'Not found';

			const action = store.actions.receiveError(cacheKey, error);

			expect(action).toEqual({
				type: 'RECEIVE_ERROR',
				cacheKey,
				error,
			});
		});

		it('should create invalidate action', () => {
			const cacheKeys = ['query1', 'query2'];

			const action = store.actions.invalidate(cacheKeys);

			expect(action).toEqual({
				type: 'INVALIDATE',
				cacheKeys,
			});
		});

		it('should create invalidateAll action', () => {
			const action = store.actions.invalidateAll();

			expect(action).toEqual({
				type: 'INVALIDATE_ALL',
			});
		});
	});

	describe('selectors', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;
		let stateWithData: ReturnType<typeof store.reducer>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});

			// Setup state with test data
			stateWithData = store.reducer(
				undefined,
				store.actions.receiveItems(
					'query1',
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);
		});

		it('should select item by ID', () => {
			const item = store.selectors.getItem(stateWithData, 1);

			expect(item).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
		});

		it('should return undefined for non-existent item', () => {
			const item = store.selectors.getItem(stateWithData, 999);

			expect(item).toBeUndefined();
		});

		it('should select all items from a query', () => {
			// The data was stored with queryKey 'query1', need to use getItems with undefined query
			// getItems() with no query will use getQueryKey(undefined) which won't match 'query1'
			// Let's use a proper query setup
			const query = {};
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const items = store.selectors.getItems(stateWithQuery, query);

			expect(items).toHaveLength(2);
			expect(items[0]).toEqual({
				id: 1,
				title: 'Thing One',
				status: 'active',
			});
			expect(items[1]).toEqual({
				id: 2,
				title: 'Thing Two',
				status: 'inactive',
			});
		});

		it('should select list by query key', () => {
			// The data was stored with queryKey 'query1', so we need to query with that same key
			// Since getList uses getQueryKey internally, we need to understand what query produces 'query1'
			// For this test, let's re-setup with a proper query
			const query = { q: 'search' };
			const queryKey = JSON.stringify(query);
			const stateWithQuery = store.reducer(
				undefined,
				store.actions.receiveItems(
					queryKey,
					[
						{ id: 1, title: 'Thing One', status: 'active' },
						{ id: 2, title: 'Thing Two', status: 'inactive' },
					],
					{ total: 2, hasMore: false }
				)
			);

			const result = store.selectors.getList(stateWithQuery, query);

			expect(result.items).toEqual([
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			]);
			expect(result.total).toBe(2);
			expect(result.hasMore).toBe(false);
		});

		it('should return empty list for non-existent query', () => {
			const result = store.selectors.getList(stateWithData, {
				q: 'nonexistent',
			});

			expect(result.items).toEqual([]);
			expect(result.total).toBeUndefined();
		});

		it('should select error by cache key', () => {
			const stateWithError = store.reducer(
				undefined,
				store.actions.receiveError('thing:get:1', 'Not found')
			);

			const error = store.selectors.getError(
				stateWithError,
				'thing:get:1'
			);

			expect(error).toBe('Not found');
		});

		it('should return undefined for non-existent error', () => {
			const error = store.selectors.getError(
				stateWithData,
				'thing:get:999'
			);

			expect(error).toBeUndefined();
		});
	});

	describe('resolvers', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		describe('getItem', () => {
			it('should fetch item and return receiveItem action', async () => {
				const item = { id: 1, title: 'Thing One', status: 'active' };
				(mockResource.get as jest.Mock).mockResolvedValue(item);

				const action = await store.resolvers.getItem(1);

				expect(mockResource.get).toHaveBeenCalledWith(1);
				expect(action).toEqual({
					type: 'RECEIVE_ITEM',
					item,
				});
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.get as jest.Mock).mockRejectedValue(error);

				const action = await store.resolvers.getItem(1);

				expect(action).toEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:get:1',
					error: 'Network error',
				});
			});

			it('should throw NotImplementedError when get method not defined', async () => {
				const resourceWithoutGet = {
					...mockResource,
					get: undefined,
				};

				const storeWithoutGet = createStore({
					resource: resourceWithoutGet,
				});

				await expect(
					storeWithoutGet.resolvers.getItem(1)
				).rejects.toThrow(KernelError);
				await expect(
					storeWithoutGet.resolvers.getItem(1)
				).rejects.toThrow(/does not have a "get" method/);
			});
		});

		describe('getItems', () => {
			it('should fetch items and return receiveItems action', async () => {
				const query = { q: 'search' };
				(mockResource.list as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getItems(query);

				expect(mockResource.list).toHaveBeenCalledWith(query);
				expect(action).toEqual({
					type: 'RECEIVE_ITEMS',
					queryKey: JSON.stringify(query),
					items: mockListResponse.items,
					meta: {
						total: mockListResponse.total,
						hasMore: mockListResponse.hasMore,
						nextCursor: mockListResponse.nextCursor,
					},
				});
			});

			it('should handle query without parameters', async () => {
				(mockResource.list as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getItems();

				expect(mockResource.list).toHaveBeenCalledWith(undefined);
				expect(action).toHaveProperty('type', 'RECEIVE_ITEMS');
				expect(action).toHaveProperty('queryKey');
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.list as jest.Mock).mockRejectedValue(error);

				const action = await store.resolvers.getItems();

				expect(action).toEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:list:{}',
					error: 'Network error',
				});
			});

			it('should throw NotImplementedError when list method not defined', async () => {
				const resourceWithoutList = {
					...mockResource,
					list: undefined,
				};

				const storeWithoutList = createStore({
					resource: resourceWithoutList,
				});

				await expect(
					storeWithoutList.resolvers.getItems()
				).rejects.toThrow(KernelError);
				await expect(
					storeWithoutList.resolvers.getItems()
				).rejects.toThrow(/does not have a "list" method/);
			});
		});

		describe('getList', () => {
			it('should delegate to getItems resolver', async () => {
				const query = { status: 'active' };
				(mockResource.list as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getList(query);

				expect(mockResource.list).toHaveBeenCalledWith(query);
				expect(action).toEqual({
					type: 'RECEIVE_ITEMS',
					queryKey: JSON.stringify(query),
					items: mockListResponse.items,
					meta: {
						total: mockListResponse.total,
						hasMore: mockListResponse.hasMore,
						nextCursor: mockListResponse.nextCursor,
					},
				});
			});
		});
	});

	describe('cache key generation', () => {
		it('should use default getId with id property', () => {
			const store = createStore({
				resource: mockResource,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items[123]).toEqual(item);
		});

		it('should use default getQueryKey with JSON.stringify', () => {
			const store = createStore({
				resource: mockResource,
			});

			const query = { q: 'search', status: 'active' };
			const expectedKey = JSON.stringify(query);
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});

		it('should use custom getId function', () => {
			const customGetId = (item: MockThing) => `thing-${item.id}`;
			const store = createStore({
				resource: mockResource,
				getId: customGetId,
			});

			const item = { id: 123, title: 'Test', status: 'active' };
			const state = store.reducer(
				undefined,
				store.actions.receiveItem(item)
			);

			expect(state.items['thing-123']).toEqual(item);
		});

		it('should use custom getQueryKey function', () => {
			const customGetQueryKey = (query?: MockThingQuery) =>
				`custom-${query?.q || 'all'}`;
			const store = createStore({
				resource: mockResource,
				getQueryKey: customGetQueryKey,
			});

			const expectedKey = 'custom-search';
			const action = store.actions.receiveItems(expectedKey, [], {});

			expect(action).toHaveProperty('queryKey', expectedKey);
		});
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
								generators[operation]?.(undefined as any) || [];
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
				// Note: In real usage, this would be called inside a React component
				// and would use @wordpress/data's useSelect. Here we just verify it exists.
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
				// Note: In real usage, this would be called inside a React component
				// and would use @wordpress/data's useSelect. Here we just verify it exists.
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
				const item = await mockResource.get?.(123);
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
				const result = await mockResource.list?.(query);
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
							path: '/wpk/v1/things/:id',
							method: 'GET' as const,
						},
					},
					list: undefined,
					useList: undefined,
					prefetchList: undefined,
				};

				expect(getOnlyResource.get).toBeDefined();
				expect(getOnlyResource.useGet).toBeDefined();
				expect(getOnlyResource.prefetchGet).toBeDefined();
				expect(getOnlyResource.list).toBeUndefined();
			});

			it('should work with only list route defined', () => {
				const listOnlyResource = {
					...mockResource,
					routes: {
						list: {
							path: '/wpk/v1/things',
							method: 'GET' as const,
						},
					},
					get: undefined,
					useGet: undefined,
					prefetchGet: undefined,
				};

				expect(listOnlyResource.list).toBeDefined();
				expect(listOnlyResource.useList).toBeDefined();
				expect(listOnlyResource.prefetchList).toBeDefined();
				expect(listOnlyResource.get).toBeUndefined();
			});
		});
	});
});
