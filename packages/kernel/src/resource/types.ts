/**
 * Resource system types
 *
 * Defines the contract for resource definitions and their generated clients.
 * Resources are the canonical way to declare typed REST endpoints with
 * automatic store registration and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */

/**
 * HTTP methods supported for REST operations
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Route definition for a single REST operation
 *
 * @example
 * ```ts
 * { path: '/wpk/v1/things/:id', method: 'GET' }
 * ```
 */
export interface ResourceRoute {
	/** REST API path (may include :id, :slug patterns) */
	path: string;
	/** HTTP method */
	method: HttpMethod;
}

/**
 * Standard CRUD routes for a resource
 *
 * All routes are optional. At minimum, define the operations your resource supports.
 *
 * @example
 * ```ts
 * {
 *   list: { path: '/wpk/v1/things', method: 'GET' },
 *   get: { path: '/wpk/v1/things/:id', method: 'GET' },
 *   create: { path: '/wpk/v1/things', method: 'POST' },
 *   update: { path: '/wpk/v1/things/:id', method: 'PUT' },
 *   remove: { path: '/wpk/v1/things/:id', method: 'DELETE' }
 * }
 * ```
 */
export interface ResourceRoutes {
	/** Fetch a list/collection of resources */
	list?: ResourceRoute;
	/** Fetch a single resource by identifier */
	get?: ResourceRoute;
	/** Create a new resource */
	create?: ResourceRoute;
	/** Update an existing resource */
	update?: ResourceRoute;
	/** Delete a resource */
	remove?: ResourceRoute;
}

/**
 * Cache key generator function
 *
 * Generates a unique key for caching resource data in the store.
 * Keys should be deterministic based on query parameters.
 *
 * @param params - Query parameters or identifier
 * @return Array of cache key segments
 *
 * @example
 * ```ts
 * (params) => ['thing', 'list', params?.q, params?.cursor]
 * (id) => ['thing', 'get', id]
 * ```
 */
export type CacheKeyFn<TParams = unknown> = (
	params?: TParams
) => (string | number | boolean | null | undefined)[];

/**
 * Cache key generators for all CRUD operations
 *
 * @example
 * ```ts
 * {
 *   list: (q) => ['thing', 'list', q?.search, q?.page],
 *   get: (id) => ['thing', 'get', id]
 * }
 * ```
 */
export interface CacheKeys {
	/** Cache key for list operations */
	list?: CacheKeyFn<unknown>;
	/** Cache key for single-item fetch */
	get?: CacheKeyFn<string | number>;
	/** Cache key for create operations (typically not cached) */
	create?: CacheKeyFn<unknown>;
	/** Cache key for update operations */
	update?: CacheKeyFn<string | number>;
	/** Cache key for delete operations */
	remove?: CacheKeyFn<string | number>;
}

/**
 * Complete resource definition configuration
 *
 * @template T - The resource entity type (e.g., Thing)
 * @template TQuery - Query parameters type for list operations (e.g., { q?: string })
 *
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/wpk/v1/things', method: 'GET' },
 *     get: { path: '/wpk/v1/things/:id', method: 'GET' }
 *   },
 *   cacheKeys: {
 *     list: (q) => ['thing', 'list', q?.q],
 *     get: (id) => ['thing', 'get', id]
 *   },
 *   schema: import('./thing.schema.json')
 * })
 * ```
 */
export interface ResourceConfig<
	T = unknown,
	TQuery = unknown,
	// Type parameters used by defineResource function signature, not directly in this interface

	_TTypes = [T, TQuery],
> {
	/**
	 * Unique resource name (lowercase, singular recommended)
	 *
	 * Used for store keys, event names, and debugging
	 */
	name: string;

	/**
	 * REST route definitions
	 *
	 * Define only the operations your resource supports
	 */
	routes: ResourceRoutes;

	/**
	 * Cache key generators
	 *
	 * Optional. If omitted, default cache keys based on resource name will be used
	 */
	cacheKeys?: CacheKeys;

	/**
	 * JSON Schema for runtime validation
	 *
	 * Optional. Provides runtime type safety and validation errors
	 *
	 * @example
	 * ```ts
	 * schema: import('../../contracts/thing.schema.json')
	 * ```
	 */
	schema?: Promise<unknown> | unknown;
}

/**
 * List response with pagination metadata
 *
 * @template T - The resource entity type
 */
export interface ListResponse<T> {
	/** Array of resource entities */
	items: T[];
	/** Total count of items (if available) */
	total?: number;
	/** Pagination cursor for next page */
	nextCursor?: string;
	/** Whether there are more pages */
	hasMore?: boolean;
}

/**
 * Client methods for REST operations
 *
 * Generated automatically by defineResource based on configured routes.
 * All methods return Promises with typed responses.
 *
 * @template T - The resource entity type
 * @template TQuery - Query parameters type for list operations
 */
export interface ResourceClient<T = unknown, TQuery = unknown> {
	/**
	 * Fetch a list of resources
	 *
	 * @param query - Query parameters (filters, pagination, etc.)
	 * @return Promise resolving to list response
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error
	 */
	list?: (query?: TQuery) => Promise<ListResponse<T>>;

	/**
	 * Fetch a single resource by ID
	 *
	 * @param id - Resource identifier
	 * @return Promise resolving to resource entity
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404)
	 */
	get?: (id: string | number) => Promise<T>;

	/**
	 * Create a new resource
	 *
	 * @param data - Resource data to create
	 * @return Promise resolving to created resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including validation errors)
	 */
	create?: (data: Partial<T>) => Promise<T>;

	/**
	 * Update an existing resource
	 *
	 * @param id   - Resource identifier
	 * @param data - Partial resource data to update
	 * @return Promise resolving to updated resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404, validation errors)
	 */
	update?: (id: string | number, data: Partial<T>) => Promise<T>;

	/**
	 * Delete a resource
	 *
	 * @param id - Resource identifier
	 * @return Promise resolving to void or deleted resource
	 * @throws TransportError on network failure
	 * @throws ServerError on REST API error (including 404)
	 */
	remove?: (id: string | number) => Promise<void | T>;
}

/**
 * Complete resource object returned by defineResource
 *
 * Combines client methods, store key, cache key generators, and metadata.
 * Provides both thin-flat API (direct methods) and grouped API (namespaces).
 *
 * @template T - The resource entity type
 * @template TQuery - Query parameters type for list operations
 *
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({ ... });
 *
 * // Use client methods (thin-flat API)
 * const items = await thing.list({ q: 'search' });
 * const item = await thing.get(123);
 *
 * // Use React hooks
 * const { data, isLoading } = thing.useGet(123);
 * const { data: items } = thing.useList({ q: 'search' });
 *
 * // Prefetch data
 * await thing.prefetchGet(123);
 * await thing.prefetchList({ q: 'search' });
 *
 * // Instance-based invalidation
 * thing.invalidate(['list']); // Invalidate all lists
 * thing.invalidate(['list', 'active']); // Invalidate specific query
 *
 * // Generate cache keys
 * const key = thing.key('list', { q: 'search' });
 *
 * // Use in store selectors
 * const storeKey = thing.storeKey; // 'wpk/thing'
 *
 * // Access @wordpress/data store (lazy-loaded, auto-registered)
 * const store = thing.store;
 * const item = select(store).getItem(123);
 * ```
 */
export interface ResourceObject<T = unknown, TQuery = unknown>
	extends ResourceClient<T, TQuery> {
	/**
	 * Resource name
	 */
	name: string;

	/**
	 * WordPress data store key (e.g., 'wpk/thing')
	 *
	 * Used for store registration and selectors
	 */
	storeKey: string;

	/**
	 * Lazy-loaded @wordpress/data store
	 *
	 * Automatically registered on first access.
	 * Returns the store descriptor compatible with select/dispatch.
	 *
	 * @example
	 * ```ts
	 * import { select } from '@wordpress/data';
	 * const item = select(thing.store).getItem(123);
	 * ```
	 */
	readonly store: unknown; // Type is unknown because @wordpress/data types are complex

	/**
	 * Cache key generators for all operations
	 *
	 * Use these to generate cache keys for invalidation
	 */
	cacheKeys: Required<CacheKeys>;

	/**
	 * REST route definitions (normalized)
	 */
	routes: ResourceRoutes;

	// Thin-flat API: React hooks
	/**
	 * React hook to fetch a single item
	 *
	 * Uses @wordpress/data's useSelect under the hood.
	 * Automatically handles loading states and re-fetching.
	 *
	 * @param id - Item identifier
	 * @return Hook result with data, isLoading, error
	 *
	 * @example
	 * ```ts
	 * function ThingView({ id }: { id: number }) {
	 *   const { data: thing, isLoading } = thing.useGet(id);
	 *   if (isLoading) return <Spinner />;
	 *   return <div>{thing.title}</div>;
	 * }
	 * ```
	 */
	useGet?: (id: string | number) => {
		data: T | undefined;
		isLoading: boolean;
		error: string | undefined;
	};

	/**
	 * React hook to fetch a list of items
	 *
	 * Uses @wordpress/data's useSelect under the hood.
	 * Automatically handles loading states and re-fetching.
	 *
	 * @param query - Query parameters
	 * @return Hook result with data, isLoading, error
	 *
	 * @example
	 * ```ts
	 * function ThingList({ status }: { status: string }) {
	 *   const { data, isLoading } = thing.useList({ status });
	 *   if (isLoading) return <Spinner />;
	 *   return <List items={data?.items} />;
	 * }
	 * ```
	 */
	useList?: (query?: TQuery) => {
		data: ListResponse<T> | undefined;
		isLoading: boolean;
		error: string | undefined;
	};

	// Thin-flat API: Prefetch methods
	/**
	 * Prefetch a single item into the cache
	 *
	 * Useful for optimistic loading or preloading data before navigation.
	 * Does not return the data, only ensures it's in the cache.
	 *
	 * @param id - Item identifier
	 * @return Promise resolving when prefetch completes
	 *
	 * @example
	 * ```ts
	 * // Prefetch on hover
	 * <Link onMouseEnter={() => thing.prefetchGet(123)}>
	 *   View Thing
	 * </Link>
	 * ```
	 */
	prefetchGet?: (id: string | number) => Promise<void>;

	/**
	 * Prefetch a list of items into the cache
	 *
	 * Useful for optimistic loading or preloading data before navigation.
	 * Does not return the data, only ensures it's in the cache.
	 *
	 * @param query - Query parameters
	 * @return Promise resolving when prefetch completes
	 *
	 * @example
	 * ```ts
	 * // Prefetch on app mount
	 * useEffect(() => {
	 *   thing.prefetchList({ status: 'active' });
	 * }, []);
	 * ```
	 */
	prefetchList?: (query?: TQuery) => Promise<void>;

	// Thin-flat API: Cache management
	/**
	 * Invalidate cached data for this resource
	 *
	 * Instance method alternative to global `invalidate()` function.
	 * Automatically scoped to this resource's store.
	 *
	 * @param patterns - Cache key patterns to invalidate
	 *
	 * @example
	 * ```ts
	 * // After creating a thing
	 * await thing.create(data);
	 * thing.invalidate(['list']); // Invalidate all lists
	 *
	 * // After updating
	 * await thing.update(id, data);
	 * thing.invalidate(['get', id]); // Invalidate specific item
	 * thing.invalidate(['list']); // Also invalidate lists
	 * ```
	 */
	invalidate: (
		patterns: (string | number | boolean | null | undefined)[][]
	) => void;

	/**
	 * Generate a cache key for this resource
	 *
	 * Useful for manual cache management or debugging.
	 *
	 * @param operation - Operation name ('list', 'get', etc.)
	 * @param params    - Parameters for the operation
	 * @return Cache key array
	 *
	 * @example
	 * ```ts
	 * const key = thing.key('list', { status: 'active' });
	 * // => ['thing', 'list', '{"status":"active"}']
	 *
	 * const key2 = thing.key('get', 123);
	 * // => ['thing', 'get', 123]
	 * ```
	 */
	key: (
		operation: 'list' | 'get' | 'create' | 'update' | 'remove',
		params?: TQuery | string | number | Partial<T>
	) => (string | number | boolean)[];
}

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

type AnyFn = (...args: never[]) => unknown;

/**
 * Actions for a resource store.
 *
 * @template T - The resource entity type
 */
export interface ResourceActions<T> extends Record<string, AnyFn> {
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
export interface ResourceResolvers<_T, TQuery = unknown>
	extends Record<string, AnyFn> {
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
