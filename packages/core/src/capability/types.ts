/**
 * Capability module type definitions.
 *
 * These types describe the runtime contract for declarative capability capabilities.
 * Capabilities are evaluated both within actions (for enforcement) and within UI hooks
 * (for conditional rendering). All enforcement flows through strongly typed helpers
 * produced by `defineCapability()`.
 *
 * Key contracts:
 * - **CapabilityRule**: Sync/async capability check function signature
 * - **CapabilityContext**: Rule evaluation context with adapters and cache
 * - **CapabilityHelpers**: Public API returned by defineCapability()
 * - **CapabilityCache**: Cache storage and synchronization interface
 * - **UseCapabilityResult**: React hook return type for UI integration
 *
 * @module @wpkernel/core/capability/types
 */

import type { Reporter } from '../reporter';

/**
 * Reporter interface used for structured diagnostics from the capability runtime.
 *
 * Aliased from the shared reporter module to ensure capability and actions emit
 * consistent log metadata.
 */
export type CapabilityReporter = Reporter;

/**
 * Capability rule signature.
 *
 * Rules can be synchronous (return boolean) or asynchronous (return Promise<boolean>).
 * Use async rules when checking capabilities requires REST API calls or async operations
 * (e.g., wp.data.select('core').canUser(), fetch() calls).
 *
 * The capability runtime automatically caches async rule results to avoid redundant API calls.
 * Rules receive a CapabilityContext with adapters, cache, and reporter for structured evaluation.
 *
 * @template P - Parameters required by the rule. `void` indicates no params needed.
 * @example
 * ```typescript
 * // Synchronous rule (no params)
 * const viewRule: CapabilityRule<void> = (ctx) => {
 *   return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
 * };
 *
 * // Async rule with params
 * const editRule: CapabilityRule<number> = async (ctx, postId) => {
 *   const result = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: postId
 *   });
 *   return result ?? false;
 * };
 *
 * // Complex params
 * const assignRule: CapabilityRule<{ userId: number; postId: number }> = async (ctx, params) => {
 *   const canEdit = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: params.postId
 *   });
 *   return canEdit && params.userId > 0;
 * };
 * ```
 */
export type CapabilityRule<P = void> = (
	ctx: CapabilityContext,
	params: P
) => boolean | Promise<boolean>;

/**
 * Mapping from capability key to rule implementation.
 */
export type CapabilityMap<Keys extends Record<string, unknown>> = {
	[K in keyof Keys]: CapabilityRule<Keys[K]>;
};

/**
 * Extract the tuple type used for params in `can`/`assert` helpers.
 * Ensures that void params are optional while others remain required.
 */
export type ParamsOf<K, Key extends keyof K> = K[Key] extends void
	? []
	: [K[Key]];

/**
 * Cache storage options for capability evaluations.
 */
export type CapabilityCacheOptions = {
	ttlMs?: number;
	storage?: 'memory' | 'session';
	crossTab?: boolean;
};

/**
 * Entry stored in the capability cache.
 */
export type CapabilityCacheEntry = {
	value: boolean;
	expiresAt: number;
};

/**
 * Minimal cache contract used by the capability runtime and React hook.
 */
export type CapabilityCache = {
	get: (key: string) => boolean | undefined;
	set: (
		key: string,
		value: boolean,
		options?: {
			ttlMs?: number;
			source?: 'local' | 'remote';
			expiresAt?: number;
		}
	) => void;
	invalidate: (capabilityKey?: string) => void;
	clear: () => void;
	keys: () => string[];
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => number;
};

/**
 * Adapters that capability rules can leverage when evaluating capabilities.
 *
 * Adapters provide standardized interfaces for capability checking across different
 * systems (WordPress core, REST APIs, custom backends). The capability runtime auto-detects
 * and injects wp.data.select('core').canUser() when available.
 *
 * @example
 * ```typescript
 * // Using WordPress adapter in capability rule
 * const capability = defineCapability({
 *   map: {
 *     'posts.edit': async (ctx, postId: number) => {
 *     // ctx.adapters.wp is auto-injected
 *     const result = await ctx.adapters.wp?.canUser('update', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   }
 * });
 * ```
 * @example
 * ```typescript
 * // Custom adapter for REST endpoint probing
 * const capability = defineCapability({
 *   map: rules,
 *   options: {
 *     adapters: {
 *       restProbe: async (key) => {
 *         const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
 *         return res.ok;
 *       }
 *     }
 *   }
 * });
 *
 * // Use in rule
 * 'feature.enabled': async (ctx) => {
 *   return await ctx.adapters.restProbe?.('advanced-features') ?? false;
 * }
 * ```
 */
export type CapabilityAdapters = {
	wp?: {
		canUser: (
			action: 'create' | 'read' | 'update' | 'delete',
			resource:
				| { path: string }
				| { kind: 'postType'; name: string; id?: number }
		) => boolean | Promise<boolean>;
	};
	restProbe?: (key: string) => Promise<boolean>;
};

/**
 * Capability evaluation context passed to every rule.
 *
 * The context provides adapters for capability checking, cache for result storage,
 * reporter for logging, and namespace for event naming. Rules receive this as their
 * first parameter and use it to make capability decisions.
 *
 * @example
 * ```typescript
 * const rule: CapabilityRule<number> = async (ctx, postId) => {
 *   // Log evaluation
 *   ctx.reporter?.debug('Checking edit capability', { postId });
 *
 *   // Check cached result first
 *   const cacheKey = `posts.edit::${postId}`;
 *   const cached = ctx.cache.get(cacheKey);
 *   if (typeof cached === 'boolean') {
 *     ctx.reporter?.debug('Cache hit', { result: cached });
 *     return cached;
 *   }
 *
 *   // Use adapter for capability check
 *   const result = await ctx.adapters.wp?.canUser('update', {
 *     kind: 'postType',
 *     name: 'post',
 *     id: postId
 *   }) ?? false;
 *
 *   ctx.reporter?.info('Capability checked', { postId, result });
 *   return result;
 * };
 * ```
 */
export type CapabilityContext = {
	namespace: string;
	adapters: CapabilityAdapters;
	cache: CapabilityCache;
	reporter?: CapabilityReporter;
};

/**
 * Additional options accepted by `defineCapability()`.
 */
export type CapabilityOptions = {
	namespace?: string;
	adapters?: CapabilityAdapters;
	cache?: CapabilityCacheOptions;
	debug?: boolean;
};

/**
 * Configuration object accepted by `defineCapability()`.
 */
export type CapabilityDefinitionConfig<K extends Record<string, unknown>> = {
	map: CapabilityMap<K>;
	options?: CapabilityOptions;
};

/**
 * Runtime helpers exposed by `defineCapability()`.
 */
export type CapabilityHelpers<K extends Record<string, unknown>> = {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean | Promise<boolean>;
	assert: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => void | Promise<void>;
	keys: () => (keyof K)[];
	extend: (additionalMap: Partial<CapabilityMap<K>>) => void;
	readonly cache: CapabilityCache;
};

/**
 * Payload emitted with `{namespace}.capability.denied` events.
 */
export type CapabilityDeniedEvent = {
	capabilityKey: string;
	context?: Record<string, unknown>;
	requestId?: string;
	timestamp: number;
	reason?: string;
	messageKey?: string;
};

/**
 * Result returned by the `useCapability()` hook.
 */
export type UseCapabilityResult<K extends Record<string, unknown>> = {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
};
