/**
 * Resource system exports
 *
 * Core primitives for defining typed REST resources with automatic
 * client generation, store keys, and cache management.
 */

export { defineResource } from './define';
export {
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './cache';
export type { InvalidateOptions, CacheKeyPattern, PathParams } from './cache';
export type {
	HttpMethod,
	ResourceRoute,
	ResourceRoutes,
	ResourceIdentityConfig,
	ResourcePostMetaDescriptor,
	ResourceStorageConfig,
	ResourceStoreOptions,
	CacheKeyFn,
	CacheKeys,
	ResourceQueryParamDescriptor,
	ResourceQueryParams,
	ResourceConfig,
	ListResponse,
	ResourceClient,
	ResourceObject,
	ResourceUIConfig,
	ResourceAdminUIConfig,
	ResourceDataViewsUIConfig,
	ResourceDataViewsScreenConfig,
	ResourceDataViewsMenuConfig,
} from './types';
