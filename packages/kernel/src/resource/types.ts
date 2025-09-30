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
 * { path: '/gk/v1/things/:id', method: 'GET' }
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
 *   list: { path: '/gk/v1/things', method: 'GET' },
 *   get: { path: '/gk/v1/things/:id', method: 'GET' },
 *   create: { path: '/gk/v1/things', method: 'POST' },
 *   update: { path: '/gk/v1/things/:id', method: 'PUT' },
 *   remove: { path: '/gk/v1/things/:id', method: 'DELETE' }
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
 *     list: { path: '/gk/v1/things', method: 'GET' },
 *     get: { path: '/gk/v1/things/:id', method: 'GET' }
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
 *
 * @template T - The resource entity type
 * @template TQuery - Query parameters type for list operations
 *
 * @example
 * ```ts
 * const thing = defineResource<Thing, { q?: string }>({ ... });
 *
 * // Use client methods
 * const items = await thing.list({ q: 'search' });
 * const item = await thing.get(123);
 *
 * // Use in store selectors
 * const storeKey = thing.storeKey; // 'gk/thing'
 *
 * // Use cache keys for invalidation
 * invalidate(thing.cacheKeys.list({ q: 'search' }));
 * ```
 */
export interface ResourceObject<T = unknown, TQuery = unknown>
	extends ResourceClient<T, TQuery> {
	/**
	 * Resource name
	 */
	name: string;

	/**
	 * WordPress data store key (e.g., 'gk/thing')
	 *
	 * Used for store registration and selectors
	 */
	storeKey: string;

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
}
