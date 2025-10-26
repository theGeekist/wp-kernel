/**
 * WP Kernel - Core Framework Package
 *
 * Rails-like framework for building modern WordPress products where
 * JavaScript is the source of truth and PHP is a thin contract.
 *
 * @example Scoped imports (recommended)
 * ```ts
 * import { fetch } from '@wpkernel/core/http';
 * import { defineResource } from '@wpkernel/core/resource';
 * import { KernelError } from '@wpkernel/core/error';
 * ```
 *
 * @example Namespace imports (organized)
 * ```ts
 * import { http, resource, error } from '@wpkernel/core';
 * await http.fetch({ path: '/my-plugin/v1/things' });
 * resource.defineResource({ name: 'thing', routes: {...} });
 * throw new error.KernelError('ValidationError', {...});
 * ```
 *
 * @example Flat imports (convenience)
 * ```ts
 * import { fetch, defineResource, KernelError } from '@wpkernel/core';
 * ```
 *
 * @module
 */

// ============================================================================
// Global Function Implementations
// ============================================================================

/**
 * Implement global getWPData function
 * Available globally without imports via global.d.ts declaration
 */
(globalThis as { getWPData?: () => unknown }).getWPData = () => {
	if (typeof window === 'undefined') {
		return undefined;
	}
	return (window as WPGlobal).wp?.data;
};

export const VERSION = '0.5.0';

// ============================================================================
// Namespace Exports (Organized by module)
// ============================================================================

export * as http from './http/index.js';
export * as resource from './resource/index.js';
export * as error from './error/index.js';
export * as namespace from './namespace/index.js';
export * as actions from './actions/index.js';
export * as policy from './policy/index.js';
export * as data from './data/index.js';
export * as events from './events/index.js';
export * as contracts from './contracts/index.js';
export * as pipeline from './pipeline/index.js';

// ============================================================================
// Flat Exports (Convenience aliases)
// ============================================================================

// Contracts
export {
	ACTION_LIFECYCLE_PHASES,
	WPK_CONFIG_SOURCES,
	WPK_EVENTS,
	WPK_EXIT_CODES,
	WPK_INFRASTRUCTURE,
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
	serializeKernelError,
} from './contracts/index.js';
export type { ActionLifecyclePhase, WPKExitCode } from './contracts/index.js';

// Error classes
export { KernelError, TransportError, ServerError } from './error/index.js';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './error/index.js';

// HTTP transport
export { fetch } from './http/fetch.js';
export type {
	HttpMethod,
	TransportRequest,
	TransportResponse,
	TransportMeta,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
} from './http/types.js';

// Resource system
export { defineResource } from './resource/define.js';
export {
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './resource/cache.js';
export { createStore } from './resource/store.js';

// Global functions (re-export for convenience)
export const getWPData = globalThis.getWPData;
export type {
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
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
} from './resource/types';
export type {
	PathParams,
	CacheKeyPattern,
	InvalidateOptions,
} from './resource/cache';

// Actions system
export { defineAction } from './actions/define.js';
export {
	createActionMiddleware,
	invokeAction,
	EXECUTE_ACTION_TYPE,
} from './actions/middleware.js';
export type {
	ActionConfig,
	ActionContext,
	ActionFn,
	ActionOptions,
	ActionLifecycleEvent,
	ActionStartEvent,
	ActionCompleteEvent,
	ActionErrorEvent,
	DefinedAction,
	ResolvedActionOptions,
	ActionJobs,
	WaitOptions,
} from './actions/types';

// Policy system
export { definePolicy, createPolicyProxy } from './policy/index.js';
export type {
	PolicyRule,
	PolicyMap,
	PolicyHelpers,
	PolicyOptions,
	PolicyDefinitionConfig,
	PolicyContext,
	PolicyCache,
	PolicyCacheOptions,
	PolicyDeniedEvent,
	PolicyReporter,
	ParamsOf,
} from './policy/index.js';

// Data integration
export { configureKernel, registerKernelStore } from './data/index.js';
export { kernelEventsPlugin } from './data/plugins/events';
export type {
	KernelRegistry,
	ConfigureKernelOptions,
	KernelInstance,
	KernelUIConfig,
	KernelUIRuntime,
	KernelUIAttach,
	UIIntegrationOptions,
	KernelUIPolicyRuntime,
	NoticeStatus,
} from './data/index.js';

// Event bus
export {
	KernelEventBus,
	getKernelEventBus,
	setKernelEventBus,
	getRegisteredResources,
	getRegisteredActions,
	clearRegisteredResources,
	clearRegisteredActions,
} from './events/index.js';
export type {
	KernelEventMap,
	ResourceDefinedEvent,
	ActionDefinedEvent,
	ActionDomainEvent,
	CacheInvalidatedEvent,
	CustomKernelEvent,
} from './events/index.js';

// Reporter
export {
	createReporter,
	createNoopReporter,
	getKernelReporter,
	setKernelReporter,
	clearKernelReporter,
} from './reporter/index.js';
export type {
	Reporter,
	ReporterOptions,
	ReporterLevel,
} from './reporter/index.js';

// Namespace detection
export {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
	resetNamespaceCache,
} from './namespace/detect.js';
export type {
	NamespaceDetectionOptions,
	NamespaceDetectionResult,
	NamespaceDetectionMode,
	NamespaceRuntimeContext,
} from './namespace/detect.js';
