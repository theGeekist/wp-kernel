/**
 * Resource system exports
 *
 * Core primitives for defining typed REST resources with automatic
 * client generation, store keys, and cache management.
 */

export { defineResource } from './defineResource.js';
export {
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './cache.js';
export type {
	InvalidateOptions,
	CacheKeyPattern,
	PathParams,
} from './cache.js';
export type {
	HttpMethod,
	ResourceRoute,
	ResourceRoutes,
	CacheKeyFn,
	CacheKeys,
	ResourceConfig,
	ListResponse,
	ResourceClient,
	ResourceObject,
} from './types.js';
