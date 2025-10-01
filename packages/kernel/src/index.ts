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
export { KernelError, TransportError, ServerError } from './errors/index.js';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './errors/index.js';

/**
 * Transport layer (Sprint 1 - A3)
 */
export { fetch } from './transport/fetch.js';
export type {
	HttpMethod,
	TransportRequest,
	TransportResponse,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
} from './transport/types.js';

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
} from './resource/index.js';
export { createStore } from './resource/store/createStore.js';
export type {
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
} from './resource/index.js';
export type {
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
} from './resource/store/types.js';

/**
 * Module placeholders - implementations coming in future sprints
 *
 * Planned exports:
 * - defineAction (from './actions.js') - Sprint 3
 * - definePolicy (from './policies.js') - Sprint 2
 * - defineJob (from './jobs.js') - Sprint 4
 * - defineInteraction (from './interactivity.js') - Sprint 5
 * - registerBindingSource (from './bindings.js') - Sprint 6
 * - events (from './events.js') - Sprint 1
 */

// Future module structure:
// export * from './resource/index.js';
// export * from './actions.js';
// export * from './policies.js';
// export * from './jobs.js';
// export * from './interactivity.js';
// export * from './bindings.js';
// export * from './events.js';
// export * from './errors/index.js';
