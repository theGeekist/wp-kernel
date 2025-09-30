/**
 * WP Kernel - Core Framework Package
 *
 * Rails-like framework for building modern WordPress products
 *
 * @module
 */

/**
 * Current version of WP Kernel
 */
export const VERSION = '0.0.0';

/**
 * Error types (Sprint 1)
 */
export { KernelError, TransportError, ServerError } from './errors';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './errors';

/**
 * Resource system (Sprint 1)
 */
export {
	defineResource,
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './resource';
export { createStore } from './resource/store/createStore';
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
	PathParams,
	CacheKeyPattern,
	InvalidateOptions,
} from './resource';
export type {
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
} from './resource/store/types';

/**
 * Module placeholders - implementations coming in future sprints
 *
 * Planned exports:
 * - defineAction (from './actions') - Sprint 3
 * - definePolicy (from './policies') - Sprint 2
 * - defineJob (from './jobs') - Sprint 4
 * - defineInteraction (from './interactivity') - Sprint 5
 * - registerBindingSource (from './bindings') - Sprint 6
 * - events (from './events') - Sprint 1
 */

// Future module structure:
// export * from './resource';
// export * from './actions';
// export * from './policies';
// export * from './jobs';
// export * from './interactivity';
// export * from './bindings';
// export * from './events';
// export * from './errors';
