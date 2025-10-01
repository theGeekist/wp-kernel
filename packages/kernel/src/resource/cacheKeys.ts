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
