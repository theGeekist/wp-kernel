/**
 * Types for @wordpress/data store integration.
 *
 * @module resource/store/types
 */

import type { ResourceObject, ListResponse } from '@kernel/resource';

/**
 * State shape for a resource store.
 *
 * @template T - The resource entity type
 */
export interface ResourceState<T> {
	/**
	 * Map of items by ID.
	 */
	items: Record<string | number, T>;

	/**
	 * List queries and their results.
	 * Key is stringified query params, value is array of IDs.
	 */
	lists: Record<string, (string | number)[]>;

	/**
	 * List metadata (total count, pagination, etc).
	 */
	listMeta: Record<
		string,
		{
			total?: number;
			hasMore?: boolean;
			nextCursor?: string;
		}
	>;

	/**
	 * Error messages by cache key.
	 */
	errors: Record<string, string>;
}

/**
 * Actions for a resource store.
 *
 * @template T - The resource entity type
 */
export interface ResourceActions<T> {
	/**
	 * Receive a single item.
	 *
	 * @param item - The item to store
	 */
	receiveItem: (item: T) => void;

	/**
	 * Receive multiple items from a list query.
	 *
	 * @param queryKey - Stringified query parameters
	 * @param items    - Array of items
	 * @param meta     - List metadata (total, hasMore, nextCursor)
	 */
	receiveItems: (
		queryKey: string,
		items: T[],
		meta?: {
			total?: number;
			hasMore?: boolean;
			nextCursor?: string;
		}
	) => void;

	/**
	 * Store an error for a given cache key.
	 *
	 * @param cacheKey - The cache key that failed
	 * @param error    - Error message
	 */
	receiveError: (cacheKey: string, error: string) => void;

	/**
	 * Clear cached data for specific cache keys.
	 *
	 * @param cacheKeys - Array of cache keys to invalidate
	 */
	invalidate: (cacheKeys: string[]) => void;

	/**
	 * Clear all cached data for this resource.
	 */
	invalidateAll: () => void;
}

/**
 * Selectors for a resource store.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export interface ResourceSelectors<T, TQuery = unknown> {
	/**
	 * Get a single item by ID.
	 *
	 * @param state - Store state
	 * @param id    - Item ID
	 * @return The item or undefined if not found
	 */
	getItem: (state: ResourceState<T>, id: string | number) => T | undefined;

	/**
	 * Get items from a list query.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return Array of items
	 */
	getItems: (state: ResourceState<T>, query?: TQuery) => T[];

	/**
	 * Get list response with metadata.
	 *
	 * @param state - Store state
	 * @param query - Query parameters
	 * @return List response with items and metadata
	 */
	getList: (state: ResourceState<T>, query?: TQuery) => ListResponse<T>;

	/**
	 * Check if a selector is currently resolving.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolving
	 */
	isResolving: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Check if a selector has started resolution.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolution has started
	 */
	hasStartedResolution: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Check if a selector has finished resolution.
	 *
	 * Note: This is provided by @wordpress/data's resolution system.
	 * We include it here for type completeness.
	 *
	 * @param state        - Store state
	 * @param selectorName - Name of the selector
	 * @param args         - Arguments passed to the selector
	 * @return True if resolution has finished
	 */
	hasFinishedResolution: (
		state: ResourceState<T>,
		selectorName: string,
		args?: unknown[]
	) => boolean;

	/**
	 * Get error for a cache key.
	 *
	 * @param state    - Store state
	 * @param cacheKey - The cache key
	 * @return Error message or undefined
	 */
	getError: (state: ResourceState<T>, cacheKey: string) => string | undefined;
}

/**
 * Resolvers for a resource store.
 *
 * @template _T - The resource entity type (unused, for type inference in store creation)
 * @template TQuery - The query parameter type for list operations
 */
export interface ResourceResolvers<_T, TQuery = unknown> {
	/**
	 * Resolver for getItem selector.
	 * Fetches a single item by ID if not already in state.
	 *
	 * @param id - Item ID
	 */
	getItem: (id: string | number) => Promise<void>;

	/**
	 * Resolver for getItems selector.
	 * Fetches a list of items if not already in state.
	 *
	 * @param query - Query parameters
	 */
	getItems: (query?: TQuery) => Promise<void>;

	/**
	 * Resolver for getList selector.
	 * Same as getItems but includes metadata.
	 *
	 * @param query - Query parameters
	 */
	getList: (query?: TQuery) => Promise<void>;
}

/**
 * Store configuration for a resource.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export interface ResourceStoreConfig<T, TQuery = unknown> {
	/**
	 * The resource object this store is for.
	 */
	resource: ResourceObject<T, TQuery>;

	/**
	 * Initial state for the store.
	 */
	initialState?: Partial<ResourceState<T>>;

	/**
	 * Function to extract ID from an item.
	 * Defaults to (item) => item.id
	 */
	getId?: (item: T) => string | number;

	/**
	 * Function to generate query key from query params.
	 * Defaults to JSON.stringify
	 */
	getQueryKey?: (query?: TQuery) => string;
}

/**
 * Complete store descriptor returned by createStore.
 *
 * @template T - The resource entity type
 * @template TQuery - The query parameter type for list operations
 */
export interface ResourceStore<T, TQuery = unknown> {
	/**
	 * Store key for registration with @wordpress/data.
	 */
	storeKey: string;

	/**
	 * State selectors.
	 */
	selectors: ResourceSelectors<T, TQuery>;

	/**
	 * State actions.
	 */
	actions: ResourceActions<T>;

	/**
	 * Resolvers for async data fetching.
	 */
	resolvers: ResourceResolvers<T, TQuery>;

	/**
	 * Reducer function for state updates.
	 */
	reducer: (
		state: ResourceState<T> | undefined,
		action: unknown
	) => ResourceState<T>;

	/**
	 * Initial state.
	 */
	initialState: ResourceState<T>;
}
