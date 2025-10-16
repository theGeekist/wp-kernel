/**
 * Unit tests for createStore factory - Resolvers
 *
 * Tests the @wordpress/data store integration
 */

import { createStore } from '../../store';
import type { ResourceObject, ListResponse } from '../../types';
import { KernelError } from '../../../error/index';
import {
	createMockResource,
	type MockThing,
	type MockThingQuery,
} from '../../../../tests/resource.test-support';

// Helper to extract actions from resolver generators, handling async controls
async function collectActionsFromResolver(
	generator: Generator<unknown, void, unknown>
): Promise<unknown[]> {
	const actions: unknown[] = [];
	let result = generator.next();
	while (!result.done) {
		const value = result.value;
		actions.push(value);
		if (
			value &&
			typeof value === 'object' &&
			'promise' in (value as { promise?: unknown }) &&
			(value as { promise?: unknown }).promise instanceof Promise
		) {
			try {
				const resolved = await (value as { promise: Promise<unknown> })
					.promise;
				result = generator.next(resolved);
			} catch (error) {
				// Pass the error to the generator's catch block
				result = generator.throw(error);
			}
		} else {
			result = generator.next();
		}
	}
	return actions;
}

describe('createStore - Resolvers', () => {
	let mockResource: ResourceObject<MockThing, MockThingQuery>;
	let mockListResponse: ListResponse<MockThing>;

	beforeEach(() => {
		({ resource: mockResource, listResponse: mockListResponse } =
			createMockResource());
	});

	describe('resolvers', () => {
		let store: ReturnType<typeof createStore<MockThing, MockThingQuery>>;

		beforeEach(() => {
			store = createStore({
				resource: mockResource,
			});
		});

		describe('getItem', () => {
			it('should fetch item and yield receiveItem action', async () => {
				const item = { id: 1, title: 'Thing One', status: 'active' };
				(mockResource.fetch as jest.Mock).mockResolvedValue(item);

				const generator = store.resolvers.getItem(1);
				const actions = await collectActionsFromResolver(generator);

				expect(mockResource.fetch).toHaveBeenCalledWith(1);
				expect(actions).toHaveLength(2); // fetch promise + receiveItem action
				expect(actions[1]).toEqual({
					type: 'RECEIVE_ITEM',
					item,
				});
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.fetch as jest.Mock).mockRejectedValue(error);

				const generator = store.resolvers.getItem(1);
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
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

				const generator = storeWithoutFetch.resolvers.getItem(1);

				await expect(async () => {
					await collectActionsFromResolver(generator);
				}).rejects.toThrow(KernelError);

				const generator2 = storeWithoutFetch.resolvers.getItem(1);
				await expect(async () => {
					await collectActionsFromResolver(generator2);
				}).rejects.toThrow(/does not have a "fetch" method/);
			});
		});

		describe('getItems', () => {
			it('should fetch items and return receiveItems action', async () => {
				const query = { q: 'search' };
				(mockResource.fetchList as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const generator = store.resolvers.getItems(query);
				const actions = await collectActionsFromResolver(generator);

				expect(mockResource.fetchList).toHaveBeenCalledWith(query);
				expect(actions).toHaveLength(3);
				expect(actions[0]).toEqual({
					type: 'SET_LIST_STATUS',
					queryKey: JSON.stringify(query),
					status: 'loading',
				});
				expect(actions[2]).toEqual({
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

				const generator = store.resolvers.getItems();
				const actions = await collectActionsFromResolver(generator);

				expect(mockResource.fetchList).toHaveBeenCalledWith(undefined);
				expect(actions[2]).toHaveProperty('type', 'RECEIVE_ITEMS');
				expect(actions[2]).toHaveProperty('queryKey');
			});

			it('should return receiveError action on fetch failure', async () => {
				const error = new Error('Network error');
				(mockResource.fetchList as jest.Mock).mockRejectedValue(error);

				const generator = store.resolvers.getItems();
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
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

				const generator = storeWithoutList.resolvers.getItems();
				await expect(async () => {
					await collectActionsFromResolver(generator);
				}).rejects.toThrow(KernelError);

				const generator2 = storeWithoutList.resolvers.getItems();
				await expect(async () => {
					await collectActionsFromResolver(generator2);
				}).rejects.toThrow(/does not have a "fetchList" method/);
			});
		});

		describe('getList', () => {
			it('should delegate to getItems resolver', async () => {
				const query = { status: 'active' };
				(mockResource.fetchList as jest.Mock).mockResolvedValue(
					mockListResponse
				);

				const generator = store.resolvers.getList(query);
				const actions = await collectActionsFromResolver(generator);

				expect(mockResource.fetchList).toHaveBeenCalledWith(query);
				expect(actions).toHaveLength(3);
				expect(actions[0]).toEqual({
					type: 'SET_LIST_STATUS',
					queryKey: JSON.stringify(query),
					status: 'loading',
				});
				expect(actions[2]).toEqual({
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

			it('should handle errors in getList', async () => {
				const query = { status: 'active' };
				const error = new Error('Fetch failed');
				(mockResource.fetchList as jest.Mock).mockRejectedValue(error);

				const generator = store.resolvers.getList(query);
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'SET_LIST_STATUS',
					queryKey: JSON.stringify(query),
					status: 'loading',
				});
				expect(actions).toContainEqual({
					type: 'SET_LIST_STATUS',
					queryKey: JSON.stringify(query),
					status: 'error',
				});
				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: `thing:list:${JSON.stringify(query)}`,
					error: 'Fetch failed',
				});
			});

			it('should handle non-Error object thrown in getList', async () => {
				const query = { status: 'active' };
				(mockResource.fetchList as jest.Mock).mockRejectedValue(
					'Something went wrong'
				);

				const generator = store.resolvers.getList(query);
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: `thing:list:${JSON.stringify(query)}`,
					error: 'Unknown error',
				});
			});
		});

		describe('error handling edge cases', () => {
			it('should handle non-Error object thrown in getItem', async () => {
				// Throw a string instead of Error
				(mockResource.fetch as jest.Mock).mockRejectedValue(
					'Something went wrong'
				);

				const generator = store.resolvers.getItem(1);
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:get:1',
					error: 'Unknown error',
				});
			});

			it('should handle non-Error object thrown in getItems', async () => {
				// Throw a number instead of Error
				(mockResource.fetchList as jest.Mock).mockRejectedValue(500);

				const generator = store.resolvers.getItems();
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:list:{}',
					error: 'Unknown error',
				});
			});

			it('should use fallback cache key when cacheKeys.get is undefined', async () => {
				const resourceWithoutGetKey = {
					...mockResource,
					cacheKeys: {
						...mockResource.cacheKeys,
						get: undefined,
					},
				} as unknown as typeof mockResource;

				const storeWithoutGetKey = createStore({
					resource: resourceWithoutGetKey,
				});

				(resourceWithoutGetKey.fetch as jest.Mock).mockRejectedValue(
					new Error('Failed')
				);

				const generator = storeWithoutGetKey.resolvers.getItem(123);
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:get:123',
					error: 'Failed',
				});
			});

			it('should use fallback cache key when cacheKeys.list is undefined', async () => {
				const resourceWithoutListKey = {
					...mockResource,
					cacheKeys: {
						...mockResource.cacheKeys,
						list: undefined,
					},
				} as unknown as typeof mockResource;

				const storeWithoutListKey = createStore({
					resource: resourceWithoutListKey,
				});

				(
					resourceWithoutListKey.fetchList as jest.Mock
				).mockRejectedValue(new Error('Failed'));

				const generator = storeWithoutListKey.resolvers.getItems();
				const actions = await collectActionsFromResolver(generator);

				expect(actions).toContainEqual({
					type: 'RECEIVE_ERROR',
					cacheKey: 'thing:list:{}',
					error: 'Failed',
				});
			});
		});
	});
});
