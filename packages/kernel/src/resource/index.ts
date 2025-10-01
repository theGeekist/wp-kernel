/**
 * Resource system exports
 *
 * Core primitives for defining typed REST resources with automatic
 * client generation, store keys, and cache management.
 */

export { defineResource } from './defineResource.js';
export { interpolatePath, extractPathParams } from './interpolate.js';
export { invalidate, invalidateAll } from './invalidate.js';
export type { InvalidateOptions } from './invalidate.js';
export {
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './cacheKeys.js';
export type { CacheKeyPattern } from './cacheKeys.js';
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
export type { PathParams } from './interpolate.js';
