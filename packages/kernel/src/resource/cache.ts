import { KernelError } from '../error/index';

/**
 * Cache key utilities for resource store invalidation
 *
 * Provides deterministic cache key generation and pattern matching
 * for invalidating cached data in resource stores.
 *
 * @see Product Specification § 4.3 Actions
 */

/**
 * Cache key pattern - array of primitives (strings, numbers, booleans)
 * Null and undefined values are filtered out during normalization.
 *
 * @example
 * ```ts
 * ['thing', 'list']                    // Matches all 'thing' lists
 * ['thing', 'list', 'active']          // Matches lists filtered by 'active'
 * ['thing', 'get', 123]                // Matches get query for item 123
 * ```
 */
export type CacheKeyPattern = (string | number | boolean | null | undefined)[];

/**
 * Normalize a cache key pattern to a string representation.
 * Filters out null/undefined values and joins with colons.
 *
 * @param pattern - Cache key pattern array
 * @return Normalized string key
 *
 * @example
 * ```ts
 * normalizeCacheKey(['thing', 'list'])           // → 'thing:list'
 * normalizeCacheKey(['thing', 'list', null, 1])  // → 'thing:list:1'
 * normalizeCacheKey(['thing', 'get', 123])       // → 'thing:get:123'
 * ```
 */
export function normalizeCacheKey(pattern: CacheKeyPattern): string {
	return pattern
		.filter((segment) => segment !== null && segment !== undefined)
		.join(':');
}

/**
 * Check if a cache key matches a pattern.
 * Supports prefix matching: pattern ['thing', 'list'] matches keys starting with 'thing:list'.
 *
 * @param key     - The cache key to test (already normalized string)
 * @param pattern - The pattern to match against
 * @return True if the key matches the pattern
 *
 * @example
 * ```ts
 * matchesCacheKey('thing:list', ['thing', 'list'])              // → true
 * matchesCacheKey('thing:list:active', ['thing', 'list'])       // → true (prefix match)
 * matchesCacheKey('thing:list:active:1', ['thing', 'list'])     // → true (prefix match)
 * matchesCacheKey('thing:get:123', ['thing', 'list'])           // → false
 * matchesCacheKey('thing:list', ['thing', 'list', 'active'])    // → false
 * ```
 */
export function matchesCacheKey(
	key: string,
	pattern: CacheKeyPattern
): boolean {
	const normalizedPattern = normalizeCacheKey(pattern);

	// Empty pattern matches nothing (safety check)
	if (normalizedPattern === '') {
		return false;
	}

	// Exact match
	if (key === normalizedPattern) {
		return true;
	}

	// Prefix match: key starts with pattern followed by ':'
	// This ensures 'thing:list' matches 'thing:list:active' but not 'thing:listing'
	return key.startsWith(normalizedPattern + ':');
}

/**
 * Find all cache keys in a collection that match the given pattern.
 *
 * @param keys    - Collection of cache keys (typically from store state)
 * @param pattern - Pattern to match against
 * @return Array of matching cache keys
 *
 * @example
 * ```ts
 * const keys = ['thing:list:active', 'thing:list:inactive', 'thing:get:123'];
 * findMatchingKeys(keys, ['thing', 'list'])  // → ['thing:list:active', 'thing:list:inactive']
 * findMatchingKeys(keys, ['thing', 'get'])   // → ['thing:get:123']
 * ```
 */
export function findMatchingKeys(
	keys: string[],
	pattern: CacheKeyPattern
): string[] {
	return keys.filter((key) => matchesCacheKey(key, pattern));
}

/**
 * Find all cache keys matching any of the provided patterns.
 *
 * @param keys     - Collection of cache keys
 * @param patterns - Array of patterns to match against
 * @return Array of matching cache keys (deduplicated)
 *
 * @example
 * ```ts
 * const keys = ['thing:list:active', 'job:list:open', 'thing:get:123'];
 * findMatchingKeysMultiple(keys, [['thing', 'list'], ['job', 'list']])
 * // → ['thing:list:active', 'job:list:open']
 * ```
 */
export function findMatchingKeysMultiple(
	keys: string[],
	patterns: CacheKeyPattern[]
): string[] {
	const matchedKeys = new Set<string>();

	for (const pattern of patterns) {
		const matches = findMatchingKeys(keys, pattern);
		matches.forEach((key) => matchedKeys.add(key));
	}

	return Array.from(matchedKeys);
}

/**
 * REST path interpolation utilities
 *
 * Handles dynamic path segments like :id, :slug in REST routes.
 *
 * @example
 * ```ts
 * interpolatePath('/my-plugin/v1/things/:id', { id: 123 })
 * // => '/my-plugin/v1/things/123'
 *
 * interpolatePath('/my-plugin/v1/things/:id/comments/:commentId', { id: 1, commentId: 42 })
 * // => '/my-plugin/v1/things/1/comments/42'
 * ```
 */

/**
 * Path parameter values (string, number, or boolean)
 */
export type PathParams = Record<string, string | number | boolean>;

/**
 * Interpolate dynamic segments in a REST path
 *
 * Replaces `:paramName` patterns with values from the params object.
 * Throws DeveloperError if required params are missing.
 *
 * @param path   - REST path with :param placeholders
 * @param params - Parameter values to interpolate
 * @return Interpolated path
 * @throws DeveloperError if required params are missing
 *
 * @example
 * ```ts
 * interpolatePath('/my-plugin/v1/things/:id', { id: 123 })
 * // => '/my-plugin/v1/things/123'
 *
 * interpolatePath('/my-plugin/v1/things/:id', {}) // throws DeveloperError
 * ```
 */
export function interpolatePath(path: string, params: PathParams = {}): string {
	// Find all :param patterns
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));

	// Track which params are required
	const requiredParams = matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
	const missingParams = requiredParams.filter(
		(param) =>
			!(param in params) ||
			params[param] === null ||
			params[param] === undefined
	);

	if (missingParams.length > 0) {
		throw new KernelError('DeveloperError', {
			message: `Missing required path parameters: ${missingParams.join(', ')}`,
			data: {
				validationErrors: [],
				path,
				requiredParams,
				providedParams: Object.keys(params),
				missingParams,
			},
			context: {
				path,
			},
		});
	}

	// Replace :param with values
	let interpolated = path;
	for (const [fullMatch, paramName] of matches) {
		if (paramName) {
			const value = params[paramName];
			interpolated = interpolated.replace(fullMatch, String(value));
		}
	}

	return interpolated;
}

/**
 * Extract parameter names from a path
 *
 * @param path - REST path with :param placeholders
 * @return Array of parameter names
 *
 * @example
 * ```ts
 * extractPathParams('/my-plugin/v1/things/:id')
 * // => ['id']
 *
 * extractPathParams('/my-plugin/v1/things/:id/comments/:commentId')
 * // => ['id', 'commentId']
 * ```
 */
export function extractPathParams(path: string): string[] {
	const paramPattern = /:([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
	const matches = Array.from(path.matchAll(paramPattern));
	return matches
		.map((match) => match[1])
		.filter((p): p is string => p !== undefined);
}

/**
 * Cache invalidation helper for resource stores
 *
 * Provides a centralized way to invalidate cached data across
 * all registered resource stores based on cache key patterns.
 *
 * @see Product Specification § 4.3 Actions
 */

/**
 * Options for invalidate function
 */
export interface InvalidateOptions {
	/**
	 * Store key to target (e.g., 'my-plugin/thing')
	 * If not provided, invalidates across all registered stores
	 */
	storeKey?: string;

	/**
	 * Whether to emit the cache.invalidated event
	 * @default true
	 */
	emitEvent?: boolean;
}

/**
 * Registry to track resource store keys
 * This is populated when resources are defined via defineResource
 */
const registeredStoreKeys = new Set<string>();

/**
 * Register a store key for invalidation tracking
 * Called internally by defineResource
 *
 * @internal
 * @param storeKey - The store key to register (e.g., 'my-plugin/thing')
 */
export function registerStoreKey(storeKey: string): void {
	registeredStoreKeys.add(storeKey);
}

/**
 * Get all registered store keys matching the given prefix
 *
 * @param prefix - Prefix to filter by (e.g., 'my-plugin/')
 * @return Array of matching store keys
 */
function getMatchingStoreKeys(prefix: string = ''): string[] {
	const keysArray = Array.from(registeredStoreKeys);
	if (!prefix) {
		return keysArray;
	}
	return keysArray.filter((key) => key.startsWith(prefix));
}

/**
 * Invalidate cached data matching the given patterns.
 * Deletes matching cache entries and marks selectors as stale.
 *
 * This is the primary cache invalidation API used by Actions to ensure
 * UI reflects updated data after write operations.
 *
 * @param patterns - Cache key patterns to invalidate
 * @param options  - Invalidation options
 *
 * @example
 * ```ts
 * // Invalidate all list queries for 'thing' resource
 * invalidate(['thing', 'list']);
 *
 * // Invalidate specific query
 * invalidate(['thing', 'list', 'active']);
 *
 * // Invalidate across multiple resources
 * invalidate([
 *   ['thing', 'list'],
 *   ['job', 'list']
 * ]);
 *
 * // Target specific store
 * invalidate(['thing', 'list'], { storeKey: 'my-plugin/thing' });
 * ```
 */
export function invalidate(
	patterns: CacheKeyPattern | CacheKeyPattern[],
	options: InvalidateOptions = {}
): void {
	const { storeKey, emitEvent = true } = options;

	// Normalize patterns to array
	const patternsArray = Array.isArray(patterns[0])
		? (patterns as CacheKeyPattern[])
		: [patterns as CacheKeyPattern];

	// Get data registry
	const dataRegistry = getWPData();
	if (!dataRegistry) {
		// In test/node environment, just return
		// Tests will mock this function as needed
		return;
	}

	// Determine which stores to invalidate
	const storeKeys = storeKey ? [storeKey] : getMatchingStoreKeys();

	// Track which keys were actually invalidated (for event emission)
	const invalidatedKeysSet = new Set<string>();

	// For each store, find matching cache keys and invalidate
	for (const key of storeKeys) {
		try {
			// Get store's dispatch to call invalidate action
			const dispatch = dataRegistry?.dispatch(key);
			if (
				!dispatch ||
				typeof dispatch !== 'object' ||
				!('invalidate' in dispatch) ||
				typeof dispatch.invalidate !== 'function'
			) {
				continue;
			}

			// Get current state to find matching keys
			// The state structure is: { items: {}, lists: {}, listMeta: {}, errors: {} }
			const select = dataRegistry?.select(key);
			const state = select?.getState?.() || {};

			// Collect all unique cache keys from the state
			const allKeysSet = new Set<string>([
				...Object.keys(state.lists || {}),
				...Object.keys(state.listMeta || {}),
				...Object.keys(state.errors || {}),
			]);
			const allKeys = Array.from(allKeysSet);

			// Find keys matching our patterns
			const matchingKeys = allKeys.filter((cacheKey) =>
				patternsArray.some((pattern) => {
					const normalizedPattern = normalizeCacheKey(pattern);
					// Check if key starts with pattern
					return (
						cacheKey === normalizedPattern ||
						cacheKey.startsWith(normalizedPattern + ':')
					);
				})
			);

			if (matchingKeys.length > 0) {
				// Dispatch invalidate action with proper typing
				(dispatch.invalidate as (keys: string[]) => void)(matchingKeys);
				matchingKeys.forEach((k) => invalidatedKeysSet.add(k));
			}
		} catch (error) {
			// Silently fail - store might not be registered yet
			// In development, could log this for debugging
			if (process.env.NODE_ENV === 'development') {
				console.warn(
					`Failed to invalidate cache for store ${key}:`,
					error
				);
			}
		}
	}

	// Emit event if requested
	if (emitEvent && invalidatedKeysSet.size > 0) {
		emitCacheInvalidatedEvent(Array.from(invalidatedKeysSet));
	}
}

/**
 * Emit the cache.invalidated event
 *
 * @param keys - The cache keys that were invalidated
 */
function emitCacheInvalidatedEvent(keys: string[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	// Use the global wp object with proper typing fallback
	const wp = (
		window as Window & {
			wp?: {
				hooks?: { doAction: (event: string, data: unknown) => void };
			};
		}
	).wp;

	if (wp?.hooks?.doAction) {
		wp.hooks.doAction('wpk.cache.invalidated', { keys });
	}
}

/**
 * Invalidate all caches in a specific store
 *
 * @param storeKey - The store key to invalidate (e.g., 'my-plugin/thing')
 *
 * @example
 * ```ts
 * // Clear all cached data for 'thing' resource
 * invalidateAll('my-plugin/thing');
 * ```
 */
export function invalidateAll(storeKey: string): void {
	const dataRegistry = getWPData();
	if (!dataRegistry) {
		return;
	}

	try {
		const dispatch = dataRegistry.dispatch(storeKey);
		if (
			dispatch &&
			typeof dispatch === 'object' &&
			'invalidateAll' in dispatch &&
			typeof dispatch.invalidateAll === 'function'
		) {
			(dispatch.invalidateAll as () => void)();

			// Emit event
			emitCacheInvalidatedEvent([`${storeKey}:*`]);
		}
	} catch (error) {
		if (process.env.NODE_ENV === 'development') {
			console.warn(
				`Failed to invalidate all caches for store ${storeKey}:`,
				error
			);
		}
	}
}
