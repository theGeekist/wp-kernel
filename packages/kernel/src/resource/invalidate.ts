/**
 * Cache invalidation helper for resource stores
 *
 * Provides a centralized way to invalidate cached data across
 * all registered resource stores based on cache key patterns.
 *
 * @see Product Specification § 4.3 Actions
 */

import { type CacheKeyPattern, normalizeCacheKey } from './cacheKeys';

/**
 * Type for WordPress data registry (external dependency)
 * We type it minimally to avoid depending on @wordpress/data types
 */
interface WordPressDataRegistry {
	select: (storeKey: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	};
	dispatch: (storeKey: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		invalidate?: (cacheKeys: string[]) => any;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	};
}

/**
 * Get the WordPress data registry from global scope
 * Returns null if not available (e.g., in tests or Node environment)
 */
function getDataRegistry(): WordPressDataRegistry | null {
	if (typeof window === 'undefined') {
		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const globalWp = (window as any).wp;
	return globalWp?.data || null;
}

/**
 * Options for invalidate function
 */
export interface InvalidateOptions {
	/**
	 * Store key to target (e.g., 'gk/thing')
	 * If not provided, invalidates across all 'gk/*' stores
	 */
	storeKey?: string;

	/**
	 * Whether to emit the wpk.cache.invalidated event
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
 * @param storeKey - The store key to register (e.g., 'gk/thing')
 */
export function registerStoreKey(storeKey: string): void {
	registeredStoreKeys.add(storeKey);
}

/**
 * Get all registered store keys matching the given prefix
 *
 * @param prefix - Prefix to filter by (e.g., 'gk/')
 * @return Array of matching store keys
 */
function getMatchingStoreKeys(prefix: string = 'gk/'): string[] {
	return Array.from(registeredStoreKeys).filter((key) =>
		key.startsWith(prefix)
	);
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
 * invalidate(['thing', 'list'], { storeKey: 'gk/thing' });
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
	const dataRegistry = getDataRegistry();
	if (!dataRegistry) {
		// In test/node environment, just return
		// Tests will mock this function as needed
		return;
	}

	// Determine which stores to invalidate
	const storeKeys = storeKey ? [storeKey] : getMatchingStoreKeys('gk/');

	// Track which keys were actually invalidated (for event emission)
	const invalidatedKeysSet = new Set<string>();

	// For each store, find matching cache keys and invalidate
	for (const key of storeKeys) {
		try {
			// Get store's dispatch to call invalidate action
			const dispatch = dataRegistry.dispatch(key);
			if (!dispatch || typeof dispatch.invalidate !== 'function') {
				continue;
			}

			// Get current state to find matching keys
			// The state structure is: { items: {}, lists: {}, listMeta: {}, errors: {} }
			const select = dataRegistry.select(key);
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
				// Dispatch invalidate action
				dispatch.invalidate(matchingKeys);
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
 * Emit the wpk.cache.invalidated event
 *
 * @param keys - The cache keys that were invalidated
 */
function emitCacheInvalidatedEvent(keys: string[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const globalWp = (window as any).wp;
	const hooks = globalWp?.hooks;

	if (hooks?.doAction) {
		hooks.doAction('wpk.cache.invalidated', { keys });
	}
}

/**
 * Invalidate all caches in a specific store
 *
 * @param storeKey - The store key to invalidate (e.g., 'gk/thing')
 *
 * @example
 * ```ts
 * // Clear all cached data for 'thing' resource
 * invalidateAll('gk/thing');
 * ```
 */
export function invalidateAll(storeKey: string): void {
	const dataRegistry = getDataRegistry();
	if (!dataRegistry) {
		return;
	}

	try {
		const dispatch = dataRegistry.dispatch(storeKey);
		if (dispatch && typeof dispatch.invalidateAll === 'function') {
			dispatch.invalidateAll();

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
