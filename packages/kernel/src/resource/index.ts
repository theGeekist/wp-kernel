/**
 * Resource system exports
 *
 * Core primitives for defining typed REST resources with automatic
 * client generation, store keys, and cache management.
 */

export { defineResource } from './defineResource';
export { interpolatePath, extractPathParams } from './interpolate';
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
} from './types';
export type { PathParams } from './interpolate';
