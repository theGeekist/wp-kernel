/**
 * Resource utilities
 *
 * Shared helper functions used across resource modules
 */
import type * as WPData from '@wordpress/data';
import type { CacheKeys } from './types';

/**
 * WordPress global type for data package access
 */
export type WPGlobal = { wp?: { data?: typeof WPData } };

/**
 * Default cache key generators
 *
 * Used when custom cacheKeys are not provided in config.
 * Generates stable cache keys for each operation type.
 *
 * @param resourceName - Name of the resource (e.g., 'thing')
 * @return Complete set of cache key generators
 *
 * @example
 * ```ts
 * const keys = createDefaultCacheKeys('thing');
 * keys.get(123); // ['thing', 'get', 123]
 * keys.list({ q: 'search' }); // ['thing', 'list', '{"q":"search"}']
 * ```
 */
export function createDefaultCacheKeys(
	resourceName: string
): Required<CacheKeys> {
	return {
		list: (query) => [resourceName, 'list', JSON.stringify(query || {})],
		get: (id) => [resourceName, 'get', id],
		create: (data) => [resourceName, 'create', JSON.stringify(data || {})],
		update: (id) => [resourceName, 'update', id],
		remove: (id) => [resourceName, 'remove', id],
	};
}

/**
 * Get WordPress data package from global
 *
 * Helper to safely access wp.data in both browser and SSR contexts.
 *
 * @return WordPress data package or undefined if not available
 */
export function getWPData(): typeof WPData | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return (window as Window & WPGlobal).wp?.data;
}
