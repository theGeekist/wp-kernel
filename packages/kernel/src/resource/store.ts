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
} from './types.js';
import { KernelError } from '../error/index.js';

/**
 * Action types for the resource store.
 */
const ACTION_TYPES = {
	RECEIVE_ITEM: 'RECEIVE_ITEM',
	RECEIVE_ITEMS: 'RECEIVE_ITEMS',
	RECEIVE_ERROR: 'RECEIVE_ERROR',
	INVALIDATE: 'INVALIDATE',
	INVALIDATE_ALL: 'INVALIDATE_ALL',
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
 * import { thing } from './resources/thing.js';
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			[key: string]: any;
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
					typedAction.meta as ResourceState<T>['listMeta'][string];

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
						[queryKey]: meta || {},
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
	};

	// Resolvers
	const resolvers: ResourceResolvers<T, TQuery> = {
		async getItem(id: string | number): Promise<void> {
			// Check if client method exists
			if (!resource.fetch) {
				throw new KernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetch" method. ` +
						'Define a "get" route in your resource configuration.',
				});
			}

			try {
				const item = await resource.fetch(id);
				return actions.receiveItem(item);
			} catch (error) {
				const cacheKey =
					resource.cacheKeys.get?.(id).join(':') ||
					`${resource.name}:get:${id}`;
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				return actions.receiveError(cacheKey, errorMessage);
			}
		},

		async getItems(query?: TQuery): Promise<void> {
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
				const response = await resource.fetchList(query);
				return actions.receiveItems(queryKey, response.items, {
					total: response.total,
					hasMore: response.hasMore,
					nextCursor: response.nextCursor,
				});
			} catch (error) {
				const cacheKey =
					resource.cacheKeys.list?.(query).join(':') ||
					`${resource.name}:list:${queryKey}`;
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				return actions.receiveError(cacheKey, errorMessage);
			}
		},

		// getList uses the same resolver as getItems
		async getList(query?: TQuery): Promise<void> {
			return resolvers.getItems(query);
		},
	};

	return {
		storeKey,
		selectors,
		actions,
		resolvers,
		reducer,
		initialState,
	};
}
