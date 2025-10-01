/**
 * Unit tests for createStore factory - Resolvers
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../../store.js';
import type { ResourceObject, ListResponse } from '../../types.js';
import { KernelError } from '../../../error/index.js';

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

describe('createStore - Resolvers', () => {
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
				create: { path: '/wpk/v1/things', method: 'POST' },
				update: { path: '/wpk/v1/things/:id', method: 'PUT' },
				remove: { path: '/wpk/v1/things/:id', method: 'DELETE' },
			},
			fetchList: jest.fn().mockResolvedValue(mockListResponse),
			fetch: jest.fn().mockResolvedValue({
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
			// Grouped API namespaces
			select: {
				item: jest.fn().mockReturnValue(undefined),
				items: jest.fn().mockReturnValue([]),
				list: jest.fn().mockReturnValue([]),
			},
			use: {
				item: jest.fn(),
				list: jest.fn(),
			},
			get: {
				item: jest.fn().mockResolvedValue({
					id: 1,
					title: 'Thing One',
					status: 'active',
				}),
				list: jest.fn().mockResolvedValue(mockListResponse),
			},
			mutate: {
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
			},
			cache: {
				prefetch: {
					item: jest.fn().mockResolvedValue(undefined),
					list: jest.fn().mockResolvedValue(undefined),
				},
				invalidate: {
					item: jest.fn(),
					list: jest.fn(),
					all: jest.fn(),
				},
				key: jest.fn(),
			},
			storeApi: {
				key: 'wpk/thing',
				descriptor: {},
			},
			events: {
				created: 'wpk.thing.created',
				updated: 'wpk.thing.updated',
				removed: 'wpk.thing.removed',
			},
		};
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
				(mockResource.fetch as jest.Mock).mockResolvedValue(item);

				const action = await store.resolvers.getItem(1);

				expect(mockResource.fetch).toHaveBeenCalledWith(1);
				expect(action).toEqual({
					type: 'RECEIVE_ITEM',
					item,
				});
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.fetch as jest.Mock).mockRejectedValue(error);

				const action = await store.resolvers.getItem(1);

				expect(action).toEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:get:1',
					error: 'Network error',
				});
			});

			it('should throw NotImplementedError when fetch method not defined', async () => {
				const resourceWithoutFetch = {
					...mockResource,
					fetch: undefined,
				};

				const storeWithoutFetch = createStore({
					resource: resourceWithoutFetch,
				});

				await expect(
					storeWithoutFetch.resolvers.getItem(1)
				).rejects.toThrow(KernelError);
				await expect(
					storeWithoutFetch.resolvers.getItem(1)
				).rejects.toThrow(/does not have a "fetch" method/);
			});
		});

		describe('getItems', () => {
			it('should fetch items and return receiveItems action', async () => {
				const query = { q: 'search' };
				(mockResource.fetchList as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getItems(query);

				expect(mockResource.fetchList).toHaveBeenCalledWith(query);
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
				(mockResource.fetchList as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getItems();

				expect(mockResource.fetchList).toHaveBeenCalledWith(undefined);
				expect(action).toHaveProperty('type', 'RECEIVE_ITEMS');
				expect(action).toHaveProperty('queryKey');
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.fetchList as jest.Mock).mockRejectedValue(error);

				const action = await store.resolvers.getItems();

				expect(action).toEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:list:{}',
					error: 'Network error',
				});
			});

			it('should throw NotImplementedError when fetchList method not defined', async () => {
				const resourceWithoutList = {
					...mockResource,
					fetchList: undefined,
				};

				const storeWithoutList = createStore({
					resource: resourceWithoutList,
				});

				await expect(
					storeWithoutList.resolvers.getItems()
				).rejects.toThrow(KernelError);
				await expect(
					storeWithoutList.resolvers.getItems()
				).rejects.toThrow(/does not have a "fetchList" method/);
			});
		});

		describe('getList', () => {
			it('should delegate to getItems resolver', async () => {
				const query = { status: 'active' };
				(mockResource.fetchList as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const action = await store.resolvers.getList(query);

				expect(mockResource.fetchList).toHaveBeenCalledWith(query);
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
});
