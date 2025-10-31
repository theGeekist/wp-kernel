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
import { WPKernelError } from '../error/index';
import { createNoopReporter } from '../reporter';

const STORE_LOG_MESSAGES = {
	missingRoute: 'resource.store.missingRoute',
	resolverStart: 'resource.store.resolver.start',
	resolverSuccess: 'resource.store.resolver.success',
	resolverError: 'resource.store.resolver.error',
	invalidIdentifier: 'resource.store.identifier.invalid',
	duplicateIdentifier: 'resource.store.identifier.duplicate',
} as const;

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
 * import { createStore } from '@wpkernel/core/resource';
 * import { thing } from './resources/thing';
 *
 * const thingStore = createStore({
 *   resource: thing,
 *   getId: (item) => item.id,
 * });
 * ```
 *
 * @category Resource
 */
export function createStore<T, TQuery = unknown>(
	config: ResourceStoreConfig<T, TQuery>
): ResourceStore<T, TQuery> {
	const {
		resource,
		initialState: customInitialState = {},
		getId = defaultGetId,
		getQueryKey = defaultGetQueryKey,
		reporter: reporterOverride,
	} = config;

	const storeKey = resource.storeKey;
	const storeReporter = (reporterOverride ?? createNoopReporter()).child(
		'store'
	);
	const resolversReporter = storeReporter.child('resolvers');
	const resolverLoggers = {
		getItem: resolversReporter.child('getItem'),
		getItems: resolversReporter.child('getItems'),
		getList: resolversReporter.child('getList'),
	} as const;

	// Initial state
	const initialState: ResourceState<T> = {
		items: {},
		lists: {},
		listMeta: {},
		errors: {},
		...customInitialState,
	};

	function receiveItem(state: ResourceState<T>, item: T): ResourceState<T> {
		const id = getId(item);
		if ((id as unknown) === undefined) {
			storeReporter.warn(STORE_LOG_MESSAGES.invalidIdentifier, {
				resource: resource.name,
				item,
				operation: 'receiveItem',
			});
		}
		return {
			...state,
			items: {
				...state.items,
				[id]: item,
			},
		};
	}

	function receiveItems(
		state: ResourceState<T>,
		items: T[],
		queryKey: string,
		meta: ResourceState<T>['listMeta'][string] | undefined
	): ResourceState<T> {
		const nextItems = { ...state.items };
		const ids: Array<string | number> = [];
		const seenIdentifiers = new Set<string>();

		for (const item of items) {
			const id = getId(item);
			if ((id as unknown) === undefined) {
				storeReporter.warn(STORE_LOG_MESSAGES.invalidIdentifier, {
					resource: resource.name,
					item,
					operation: 'receiveItems',
					queryKey,
				});
			} else {
				const normalizedId = String(id);
				if (seenIdentifiers.has(normalizedId)) {
					storeReporter.warn(STORE_LOG_MESSAGES.duplicateIdentifier, {
						resource: resource.name,
						id,
						queryKey,
					});
				} else {
					seenIdentifiers.add(normalizedId);
				}
			}
			nextItems[id] = item;
			ids.push(id);
		}

		const cacheKey = `${resource.name}:list:${queryKey}`;
		const nextErrors = { ...state.errors };
		delete nextErrors[cacheKey];

		return {
			...state,
			items: nextItems,
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
			errors: nextErrors,
		};
	}

	function receiveError(
		state: ResourceState<T>,
		cacheKey: string,
		error: string
	): ResourceState<T> {
		return {
			...state,
			errors: {
				...state.errors,
				[cacheKey]: error,
			},
		};
	}

	function invalidateKeys(
		state: ResourceState<T>,
		cacheKeys: string[]
	): ResourceState<T> {
		const lists = { ...state.lists };
		const listMeta = { ...state.listMeta };
		const errors = { ...state.errors };

		for (const key of cacheKeys) {
			delete lists[key];
			delete listMeta[key];
			delete errors[key];
		}

		return {
			...state,
			lists,
			listMeta,
			errors,
		};
	}

	/**
	 * Reset state to empty collections.
	 * INVALIDATE_ALL intentionally clears ALL state including custom extensions
	 * to match the original behavior before refactoring.
	 */
	function resetState(): ResourceState<T> {
		return {
			items: {},
			lists: {},
			listMeta: {},
			errors: {},
		};
	}

	function setListStatus(
		state: ResourceState<T>,
		queryKey: string,
		status: ResourceListStatus
	): ResourceState<T> {
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

	const actionHandlers: Record<
		string,
		(
			state: ResourceState<T>,
			action: { [key: string]: unknown }
		) => ResourceState<T>
	> = {
		[ACTION_TYPES.RECEIVE_ITEM]: (state, action) =>
			receiveItem(state, action.item as T),
		[ACTION_TYPES.RECEIVE_ITEMS]: (state, action) =>
			receiveItems(
				state,
				(action.items as T[]) ?? [],
				(action.queryKey as string) ?? '',
				action.meta as ResourceState<T>['listMeta'][string]
			),
		[ACTION_TYPES.RECEIVE_ERROR]: (state, action) =>
			receiveError(
				state,
				(action.cacheKey as string) ?? '',
				(action.error as string) ?? ''
			),
		[ACTION_TYPES.INVALIDATE]: (state, action) =>
			invalidateKeys(state, (action.cacheKeys as string[]) ?? []),
		[ACTION_TYPES.INVALIDATE_ALL]: () => resetState(),
		[ACTION_TYPES.SET_LIST_STATUS]: (state, action) =>
			setListStatus(
				state,
				(action.queryKey as string) ?? '',
				action.status as ResourceListStatus
			),
	};

	function isAction(
		value: unknown
	): value is { type: string; [key: string]: unknown } {
		return (
			typeof value === 'object' &&
			value !== null &&
			'type' in value &&
			typeof (value as { type: unknown }).type === 'string'
		);
	}

	function reducer(
		state: ResourceState<T> = initialState,
		action: unknown
	): ResourceState<T> {
		if (!isAction(action)) {
			return state;
		}

		const handler = actionHandlers[action.type];
		return handler ? handler(state, action) : state;
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
				resolverLoggers.getItem.error(STORE_LOG_MESSAGES.missingRoute, {
					resource: resource.name,
					operation: 'getItem',
					itemId: id,
				});
				throw new WPKernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetch" method. ` +
						'Define a "get" route to enable the fetch method in your resource configuration.',
				});
			}

			const cacheKey =
				resource.cacheKeys.get?.(id).join(':') ||
				`${resource.name}:get:${String(id)}`;

			resolverLoggers.getItem.debug(STORE_LOG_MESSAGES.resolverStart, {
				resource: resource.name,
				operation: 'getItem',
				id,
				cacheKey,
			});

			try {
				const item = (yield {
					type: 'FETCH_FROM_API',
					promise: resource.fetch(id),
				}) as T;
				yield actions.receiveItem(item);
				resolverLoggers.getItem.info(
					STORE_LOG_MESSAGES.resolverSuccess,
					{
						resource: resource.name,
						operation: 'getItem',
						id,
						cacheKey,
					}
				);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
				resolverLoggers.getItem.error(
					STORE_LOG_MESSAGES.resolverError,
					{
						resource: resource.name,
						operation: 'getItem',
						id,
						cacheKey,
						error:
							error instanceof Error
								? error.message
								: String(error),
					}
				);
			}
		},

		*getItems(query?: TQuery) {
			// Check if client method exists
			if (!resource.fetchList) {
				resolverLoggers.getItems.error(
					STORE_LOG_MESSAGES.missingRoute,
					{
						resource: resource.name,
						operation: 'getItems',
						query,
					}
				);
				throw new WPKernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetchList" method. ` +
						'Define a "list" route to enable the fetchList method in your resource configuration.',
				});
			}

			const queryKey = getQueryKey(query);
			const cacheKey =
				resource.cacheKeys.list?.(query).join(':') ||
				`${resource.name}:list:${queryKey}`;

			resolverLoggers.getItems.debug(STORE_LOG_MESSAGES.resolverStart, {
				resource: resource.name,
				operation: 'getItems',
				query,
				queryKey,
				cacheKey,
			});

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
				resolverLoggers.getItems.info(
					STORE_LOG_MESSAGES.resolverSuccess,
					{
						resource: resource.name,
						operation: 'getItems',
						query,
						queryKey,
						cacheKey,
						total: response.total,
						count: response.items.length,
					}
				);
			} catch (error) {
				yield actions.setListStatus(queryKey, 'error');
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
				resolverLoggers.getItems.error(
					STORE_LOG_MESSAGES.resolverError,
					{
						resource: resource.name,
						operation: 'getItems',
						query,
						queryKey,
						cacheKey,
						error:
							error instanceof Error
								? error.message
								: String(error),
					}
				);
			}
		},

		// getList resolver - same implementation as getItems
		// Note: Cannot delegate with yield* because WordPress data tracks resolution
		// by the resolver method name, so getList must be its own resolver
		*getList(query?: TQuery) {
			// Check if client method exists
			if (!resource.fetchList) {
				resolverLoggers.getList.error(STORE_LOG_MESSAGES.missingRoute, {
					resource: resource.name,
					operation: 'getList',
					query,
				});
				throw new WPKernelError('NotImplementedError', {
					message:
						`Resource "${resource.name}" does not have a "fetchList" method. ` +
						'Define a "list" route to enable the fetchList method in your resource configuration.',
				});
			}

			const queryKey = getQueryKey(query);
			const cacheKey =
				resource.cacheKeys.list?.(query).join(':') ||
				`${resource.name}:list:${queryKey}`;

			resolverLoggers.getList.debug(STORE_LOG_MESSAGES.resolverStart, {
				resource: resource.name,
				operation: 'getList',
				query,
				queryKey,
				cacheKey,
			});

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
				resolverLoggers.getList.info(
					STORE_LOG_MESSAGES.resolverSuccess,
					{
						resource: resource.name,
						operation: 'getList',
						query,
						queryKey,
						cacheKey,
						total: response.total,
						count: response.items.length,
					}
				);
			} catch (error) {
				yield actions.setListStatus(queryKey, 'error');
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				yield actions.receiveError(cacheKey, errorMessage);
				resolverLoggers.getList.error(
					STORE_LOG_MESSAGES.resolverError,
					{
						resource: resource.name,
						operation: 'getList',
						query,
						queryKey,
						cacheKey,
						error:
							error instanceof Error
								? error.message
								: String(error),
					}
				);
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
