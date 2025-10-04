/**
 * @file Store Factory
 * Creates @wordpress/data stores from resource definitions.
 *
 * This factory function handles all the boilerplate of creating a Redux-like store
 * that's compatible with WordPress's data layer.
 */

import type {
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStore,
	ResourceStoreConfig,
	ListResponse,
	ResourceListStatus,
} from './types';
import { KernelError } from '../error/index';

/**
 * Action types for the resource store.
 */
const ACTION_TYPES = {
	RECEIVE_ITEM: 'RECEIVE_ITEM',
	RECEIVE_ITEMS: 'RECEIVE_ITEMS',
	RECEIVE_ERROR: 'RECEIVE_ERROR',
	INVALIDATE: 'INVALIDATE',
	INVALIDATE_ALL: 'INVALIDATE_ALL',
	SET_LIST_STATUS: 'SET_LIST_STATUS',
} as const;

/**
 * Default function to extract ID from an item.
 * Assumes the item has an `id` property.
 * @param item
 */
function defaultGetId<T>(item: T): string | number {
	return (item as { id: string | number }).id;
}

/**
 * Default function to generate query key from query params.
 * @param query
 */
function defaultGetQueryKey<TQuery>(query?: TQuery): string {
	return JSON.stringify(query || {});
}

/**
 * Creates a resource store with selectors, actions, and resolvers.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 * @param    config - Store configuration
 * @return Complete store descriptor
 *
 * @example
 * ```typescript
 * import { createStore } from '@geekist/wp-kernel/resource';
 * import { thing } from './resources/thing';
 *
 * const thingStore = createStore({
 *   resource: thing,
 *   getId: (item) => item.id,
 * });
 * ```
 */
export function createStore<T, TQuery = unknown>(
	config: ResourceStoreConfig<T, TQuery>
): ResourceStore<T, TQuery> {
	const {
		resource,
		initialState: customInitialState = {},
		getId = defaultGetId,
		getQueryKey = defaultGetQueryKey,
	} = config;

	const storeKey = resource.storeKey;

	// Initial state
	const initialState: ResourceState<T> = {
		items: {},
		lists: {},
		listMeta: {},
		errors: {},
		...customInitialState,
	};

	// Reducer
	function reducer(
		state: ResourceState<T> = initialState,
		action: unknown
	): ResourceState<T> {
		// Type guard for action objects
		if (
			typeof action !== 'object' ||
			action === null ||
			!('type' in action)
		) {
			return state;
		}

		const typedAction = action as {
			type: string;
			[key: string]: unknown;
		};

		switch (typedAction.type) {
			case ACTION_TYPES.RECEIVE_ITEM: {
				const item = typedAction.item as T;
				const id = getId(item);
				return {
					...state,
					items: {
						...state.items,
						[id]: item,
					},
				};
			}

			case ACTION_TYPES.RECEIVE_ITEMS: {
				const items = typedAction.items as T[];
				const queryKey = typedAction.queryKey as string;
				const meta =
					(typedAction.meta as ResourceState<T>['listMeta'][string]) ||
					{};

				const newItems = { ...state.items };
				const ids: (string | number)[] = [];

				items.forEach((item) => {
					const id = getId(item);
					newItems[id] = item;
					ids.push(id);
				});

				return {
					...state,
					items: newItems,
					lists: {
						...state.lists,
						[queryKey]: ids,
					},
					listMeta: {
						...state.listMeta,
						[queryKey]: {
							...state.listMeta[queryKey],
							...meta,
							status: 'success',
						},
					},
				};
			}

			case ACTION_TYPES.RECEIVE_ERROR: {
				const cacheKey = typedAction.cacheKey as string;
				const error = typedAction.error as string;

				return {
					...state,
					errors: {
						...state.errors,
						[cacheKey]: error,
					},
				};
			}

			case ACTION_TYPES.INVALIDATE: {
				const cacheKeys = typedAction.cacheKeys as string[];
				const newLists = { ...state.lists };
				const newListMeta = { ...state.listMeta };
				const newErrors = { ...state.errors };

				cacheKeys.forEach((key) => {
					delete newLists[key];
					delete newListMeta[key];
					delete newErrors[key];
				});

				return {
					...state,
					lists: newLists,
					listMeta: newListMeta,
					errors: newErrors,
				};
			}

			case ACTION_TYPES.INVALIDATE_ALL: {
				return {
					items: {},
					lists: {},
					listMeta: {},
					errors: {},
				};
			}

			case ACTION_TYPES.SET_LIST_STATUS: {
				const queryKey = typedAction.queryKey as string;
				const status = typedAction.status as ResourceListStatus;

				return {
					...state,
					listMeta: {
						...state.listMeta,
						[queryKey]: {
							...state.listMeta[queryKey],
							status,
						},
					},
				};
			}

			default:
				return state;
		}
	}

	// Actions
	const actions: ResourceActions<T> = {
		receiveItem(item: T) {
			return {
				type: ACTION_TYPES.RECEIVE_ITEM,
				item,
			};
		},

		receiveItems(queryKey: string, items: T[], meta) {
			return {
				type: ACTION_TYPES.RECEIVE_ITEMS,
				queryKey,
				items,
				meta,
			};
		},

		receiveError(cacheKey: string, error: string) {
			return {
				type: ACTION_TYPES.RECEIVE_ERROR,
				cacheKey,
				error,
			};
		},

		invalidate(cacheKeys: string[]) {
			return {
				type: ACTION_TYPES.INVALIDATE,
				cacheKeys,
			};
		},

		invalidateAll() {
			return {
				type: ACTION_TYPES.INVALIDATE_ALL,
			};
		},

		setListStatus(queryKey: string, status: ResourceListStatus) {
			return {
				type: ACTION_TYPES.SET_LIST_STATUS,
				queryKey,
				status,
			};
		},
	};

	// Selectors
	const selectors: ResourceSelectors<T, TQuery> = {
		getItem(state: ResourceState<T>, id: string | number): T | undefined {
			return state.items[id];
		},

		getItems(state: ResourceState<T>, query?: TQuery): T[] {
			const queryKey = getQueryKey(query);
			const ids = state.lists[queryKey] || [];
			return ids.map((id) => state.items[id]).filter(Boolean) as T[];
		},

		getList(state: ResourceState<T>, query?: TQuery): ListResponse<T> {
			const queryKey = getQueryKey(query);
			const items = selectors.getItems(state, query);
			const meta = state.listMeta[queryKey] || {};

			return {
				items,
				total: meta.total,
				hasMore: meta.hasMore,
				nextCursor: meta.nextCursor,
			};
		},

		getListStatus(state: ResourceState<T>, query?: TQuery) {
			const queryKey = getQueryKey(query);
			return state.listMeta[queryKey]?.status ?? 'idle';
		},

		getListError(state: ResourceState<T>, query?: TQuery) {
			const cacheKey =
				resource.cacheKeys.list?.(query).join(':') ||
				`${resource.name}:list:${getQueryKey(query)}`;
			return state.errors[cacheKey];
		},

		// Note: These are provided by @wordpress/data's resolution system
		// We include them here for type completeness
		isResolving(
			_state: ResourceState<T>,
			_selectorName: string,
			_args?: unknown[]
		): boolean {
			// This will be overridden by @wordpress/data
			return false;
		},

		hasStartedResolution(
			_state: ResourceState<T>,
			_selectorName: string,
			_args?: unknown[]
		): boolean {
			// This will be overridden by @wordpress/data
			return false;
		},

		hasFinishedResolution(
			_state: ResourceState<T>,
			_selectorName: string,
			_args?: unknown[]
		): boolean {
			// This will be overridden by @wordpress/data
			return false;
		},

		getError(
			state: ResourceState<T>,
			cacheKey: string
		): string | undefined {
			return state.errors[cacheKey];
		},

		/**
		 * Internal selector to get the entire state.
		 * Used by cache invalidation system to find matching cache keys.
		 *
		 * @param state - Store state
		 * @return The complete resource state
		 * @internal
		 */
		__getInternalState(state: ResourceState<T>): ResourceState<T> {
			return state;
		},
	};

	// Resolvers - using generator functions with controls pattern for promises
	const resolvers: ResourceResolvers<T, TQuery> = {
		*getItem(id: string | number) {
			// Check if client method exists
			if (!resource.fetch) {
				throw new KernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetch" method. ` +
						'Define a "get" route to enable the fetch method in your resource configuration.',
				});
			}

			try {
				const item = (yield {
					type: 'FETCH_FROM_API',
					promise: resource.fetch(id),
				}) as T;
				yield actions.receiveItem(item);
			} catch (error) {
				const cacheKey =
					resource.cacheKeys.get?.(id).join(':') ||
					`${resource.name}:get:${id}`;
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
			}
		},

		*getItems(query?: TQuery) {
			// Check if client method exists
			if (!resource.fetchList) {
				throw new KernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetchList" method. ` +
						'Define a "list" route to enable the fetchList method in your resource configuration.',
				});
			}

			const queryKey = getQueryKey(query);

			try {
				yield actions.setListStatus(queryKey, 'loading');
				const response = (yield {
					type: 'FETCH_FROM_API',
					promise: resource.fetchList(query),
				}) as ListResponse<T>;
				yield actions.receiveItems(queryKey, response.items, {
					total: response.total,
					hasMore: response.hasMore,
					nextCursor: response.nextCursor,
				});
			} catch (error) {
				yield actions.setListStatus(queryKey, 'error');
				const cacheKey =
					resource.cacheKeys.list?.(query).join(':') ||
					`${resource.name}:list:${queryKey}`;
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
			}
		},

		// getList resolver - same implementation as getItems
		// Note: Cannot delegate with yield* because WordPress data tracks resolution
		// by the resolver method name, so getList must be its own resolver
		*getList(query?: TQuery) {
			// Check if client method exists
			if (!resource.fetchList) {
				throw new KernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetchList" method. ` +
						'Define a "list" route to enable the fetchList method in your resource configuration.',
				});
			}

			const queryKey = getQueryKey(query);

			try {
				yield actions.setListStatus(queryKey, 'loading');
				const response = (yield {
					type: 'FETCH_FROM_API',
					promise: resource.fetchList(query),
				}) as ListResponse<T>;
				yield actions.receiveItems(queryKey, response.items, {
					total: response.total,
					hasMore: response.hasMore,
					nextCursor: response.nextCursor,
				});
			} catch (error) {
				yield actions.setListStatus(queryKey, 'error');
				const cacheKey =
					resource.cacheKeys.list?.(query).join(':') ||
					`${resource.name}:list:${queryKey}`;
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
			}
		},
	};

	return {
		storeKey,
		selectors,
		actions,
		resolvers,
		reducer,
		initialState,
		controls: {
			FETCH_FROM_API: (action: unknown) => {
				const { promise } = action as { promise: Promise<unknown> };
				return promise;
			},
		},
	};
}
