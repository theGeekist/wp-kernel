/**
 * Capability runtime — defineCapability implementation
 *
 * Capabilities provide declarative, type-safe capability checks for UI conditional rendering
 * and action enforcement. This module handles rule evaluation, caching, event emission,
 * and WordPress adapter integration.
 *
 * The capability runtime automatically:
 * - Caches evaluation results (memory + optional sessionStorage)
 * - Syncs cache across browser tabs via BroadcastChannel
 * - Emits denied events via @wordpress/hooks and PHP bridge
 * - Detects and uses wp.data.select('core').canUser() when available
 * - Registers with action runtime for ctx.capability access
 *
 * @module @wpkernel/core/capability/define
 */

import { WPKernelError } from '../error/WPKernelError';
import { CapabilityDeniedError } from '../error/CapabilityDeniedError';
import { getNamespace } from '../namespace/detect';
import {
	WPK_INFRASTRUCTURE,
	WPK_SUBSYSTEM_NAMESPACES,
} from '../contracts/index.js';
import {
	createReporter as createKernelReporter,
	createNoopReporter,
} from '../reporter';
import { resolveReporter as resolveKernelReporter } from '../reporter/resolve';
import { createCapabilityCache, createCapabilityCacheKey } from './cache';
import {
	getCapabilityRequestContext,
	getCapabilityRuntime,
	type CapabilityProxyOptions,
} from './context';
import type {
	ParamsOf,
	CapabilityAdapters,
	CapabilityContext,
	CapabilityDefinitionConfig,
	CapabilityHelpers,
	CapabilityMap,
	CapabilityOptions,
	CapabilityReporter,
	CapabilityRule,
	CapabilityDeniedEvent,
} from './types';

const POLICY_EVENT_CHANNEL = WPK_INFRASTRUCTURE.POLICY_EVENT_CHANNEL;
const POLICY_DENIED_EVENT = 'capability.denied';
const BRIDGE_POLICY_DENIED_EVENT = 'bridge.capability.denied';

const CAPABILITY_MODULE_CACHE_KEY = `${WPK_SUBSYSTEM_NAMESPACES.POLICY}.module`;

function getCapabilityModuleReporter(): CapabilityReporter {
	return resolveKernelReporter({
		fallback: () =>
			createKernelReporter({
				namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY,
				channel: 'all',
				level: 'warn',
			}),
		cache: true,
		cacheKey: CAPABILITY_MODULE_CACHE_KEY,
	});
}

type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

let eventChannel: BroadcastChannel | null | undefined;

/**
 * Get WordPress hooks interface for event emission.
 *
 * Returns null in SSR environments or when @wordpress/hooks is unavailable.
 * Used internally for emitting capability.denied events via wp.hooks.doAction().
 *
 * @return WordPress hooks interface or null if unavailable
 * @internal
 */
function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	if (!wp?.hooks || typeof wp.hooks.doAction !== 'function') {
		return null;
	}
	return wp.hooks;
}

/**
 * Get or create BroadcastChannel for cross-tab capability events.
 *
 * Caches the channel instance to avoid creating multiple channels. Returns null
 * in SSR environments or when BroadcastChannel API is unavailable. Used for
 * syncing capability.denied events across browser tabs.
 *
 * @return BroadcastChannel instance or null if unavailable
 * @internal
 */
function getEventChannel(): BroadcastChannel | null {
	if (eventChannel !== undefined) {
		return eventChannel;
	}

	if (
		typeof window === 'undefined' ||
		typeof window.BroadcastChannel !== 'function'
	) {
		eventChannel = null;
		return eventChannel;
	}

	try {
		eventChannel = new window.BroadcastChannel(POLICY_EVENT_CHANNEL);
	} catch (error) {
		getCapabilityModuleReporter().warn(
			'Failed to create BroadcastChannel for capability events.',
			{ error }
		);
		eventChannel = null;
	}

	return eventChannel;
}

/**
 * Resolve the reporter used for capability diagnostics.
 *
 * Debug mode enables the shared reporter with both console and hook transports.
 * When debug is disabled, a no-op reporter is returned to avoid noise.
 *
 * @param debug     - Whether debug mode is enabled for the capability runtime
 * @param namespace - Namespace used for reporter context
 */
function resolveCapabilityReporter(
	debug: boolean | undefined,
	namespace: string
): CapabilityReporter {
	if (!debug) {
		return createNoopReporter();
	}

	return resolveKernelReporter({
		fallback: () =>
			createKernelReporter({
				namespace,
				channel: 'all',
				level: 'debug',
			}),
		cache: true,
		cacheKey: `${WPK_SUBSYSTEM_NAMESPACES.POLICY}.definition:${namespace}`,
	});
}

/**
 * Resolve capability adapters with auto-detection.
 *
 * Merges user-provided adapters with auto-detected WordPress capabilities.
 * If user doesn't provide a wp adapter, attempts to detect and use
 * wp.data.select('core').canUser() automatically.
 *
 * @param options  - Capability options (may contain custom adapters)
 * @param reporter - Capability reporter for logging adapter resolution issues
 * @return Resolved adapters with wp and restProbe interfaces
 * @internal
 */
function resolveAdapters(
	options: CapabilityOptions | undefined,
	reporter: CapabilityReporter
): CapabilityAdapters {
	const adapters = options?.adapters ?? {};
	const resolvedWp = adapters.wp ?? detectWpCanUser(reporter);
	return {
		wp: resolvedWp,
		restProbe: adapters.restProbe,
	};
}

/**
 * Auto-detect and wrap WordPress native capability checking.
 *
 * Attempts to access wp.data.select('core').canUser() for checking WordPress
 * capabilities. Returns undefined in SSR or when @wordpress/data is unavailable.
 * The returned adapter wraps canUser with error handling and fallback to false.
 *
 * @param reporter - Capability reporter for logging detection failures
 * @return WordPress adapter interface or undefined if unavailable
 * @internal
 */
function detectWpCanUser(reporter: CapabilityReporter) {
	if (typeof window === 'undefined') {
		return undefined;
	}

	const wp = (
		window as Window & {
			wp?: {
				data?: {
					select?: (store: string) =>
						| {
								canUser?: (
									action:
										| 'create'
										| 'read'
										| 'update'
										| 'delete',
									resource:
										| { path: string }
										| {
												kind: 'postType';
												name: string;
												id?: number;
										  }
								) => boolean | Promise<boolean>;
						  }
						| undefined;
				};
			};
		}
	).wp;

	if (!wp?.data?.select) {
		return undefined;
	}

	return {
		canUser(
			action: 'create' | 'read' | 'update' | 'delete',
			resource:
				| { path: string }
				| { kind: 'postType'; name: string; id?: number }
		) {
			try {
				const store = wp.data?.select?.('core');
				const canUser = store?.canUser;
				if (typeof canUser === 'function') {
					return canUser(action, resource);
				}
				return false;
			} catch (error) {
				reporter.warn(
					'Failed to invoke wp.data.select("core").canUser',
					{
						error,
					}
				);
				return false;
			}
		},
	};
}

/**
 * Type guard asserting capability rule returned boolean value.
 *
 * Throws DeveloperError if rule returns non-boolean (e.g., number, string, object).
 * This catches developer mistakes like forgetting to return a value or returning
 * undefined from an async function.
 *
 * @param value - Value returned by capability rule
 * @param key   - Capability key for error message
 * @throws DeveloperError if value is not boolean
 * @internal
 */
function ensureBoolean(value: unknown, key: string): asserts value is boolean {
	if (typeof value !== 'boolean') {
		throw new WPKernelError('DeveloperError', {
			message: `Capability "${key}" must return a boolean. Received ${typeof value}.`,
		});
	}
}

/**
 * Emit capability.denied event to all registered listeners.
 *
 * Broadcasts to three channels:
 * - @wordpress/hooks via {namespace}.capability.denied
 * - BroadcastChannel for cross-tab notification
 * - PHP bridge (when bridged: true in action context)
 *
 * @param namespace      - Plugin namespace for event naming
 * @param payload        - Event payload (capabilityKey, context, messageKey, etc.)
 * @param requestContext - Optional captured request context (prevents race conditions in concurrent calls)
 * @internal
 */
function emitCapabilityDenied(
	namespace: string,
	payload: Omit<CapabilityDeniedEvent, 'timestamp'>,
	requestContext?: CapabilityProxyOptions
) {
	const resolvedNamespace = requestContext?.namespace ?? namespace;
	const timestamp = Date.now();
	const eventPayload: CapabilityDeniedEvent = {
		...payload,
		timestamp,
		requestId: payload.requestId ?? requestContext?.requestId,
	};

	const eventName = `${resolvedNamespace}.${POLICY_DENIED_EVENT}`;
	emitCapabilityHooks(eventName, eventPayload);
	broadcastCapabilityDenied(resolvedNamespace, eventPayload);
	emitCapabilityBridge(
		resolvedNamespace,
		eventPayload,
		requestContext,
		timestamp
	);
}

/**
 * Emit capability denied event to WordPress hooks
 *
 * @internal
 * @param eventName - Full event name (e.g., 'namespace.capability.denied')
 * @param payload   - Capability denied event payload
 */
function emitCapabilityHooks(
	eventName: string,
	payload: CapabilityDeniedEvent
): void {
	getHooks()?.doAction?.(eventName, payload);
}

/**
 * Broadcast capability denied event to other browser tabs
 *
 * Uses BroadcastChannel API for cross-tab synchronization of capability events.
 *
 * @internal
 * @param namespace - Plugin namespace for event scoping
 * @param payload   - Capability denied event payload
 */
function broadcastCapabilityDenied(
	namespace: string,
	payload: CapabilityDeniedEvent
): void {
	getEventChannel()?.postMessage({
		type: POLICY_DENIED_EVENT,
		namespace,
		payload,
	});
}

/**
 * Emit capability denied event to PHP bridge
 *
 * Sends event to server-side bridge when bridged mode is enabled in action context.
 * Only emits if request context indicates bridging is active.
 *
 * @internal
 * @param namespace      - Plugin namespace for event scoping
 * @param payload        - Capability denied event payload
 * @param requestContext - Request context containing bridged flag
 * @param timestamp      - Event timestamp in milliseconds
 */
function emitCapabilityBridge(
	namespace: string,
	payload: CapabilityDeniedEvent,
	requestContext: CapabilityProxyOptions | undefined,
	timestamp: number
): void {
	if (!requestContext?.bridged) {
		return;
	}

	const runtime = getCapabilityRuntime();
	runtime?.bridge?.emit?.(
		`${namespace}.${BRIDGE_POLICY_DENIED_EVENT}`,
		payload,
		{
			...requestContext,
			timestamp,
		}
	);
}

/**
 * Create structured CapabilityDenied error with i18n messageKey.
 *
 * Generates error with:
 * - messageKey for internationalization: "capability.denied.{namespace}.{capabilityKey}"
 * - context object with capabilityKey and params
 * - WPKernelError code: CapabilityDenied
 *
 * @param namespace     - Plugin namespace for messageKey generation
 * @param capabilityKey - Capability key that was denied
 * @param params        - Parameters passed to capability check
 * @return Object with error, messageKey, and context for event emission
 * @internal
 */
function createDeniedError(
	namespace: string,
	capabilityKey: string,
	params: unknown
) {
	const error = new CapabilityDeniedError({
		namespace,
		capabilityKey,
		params,
	});

	return {
		error,
		messageKey: error.messageKey,
		context: error.context,
	};
}

/**
 * Define a capability runtime with declarative capability rules.
 *
 * Capabilities provide **type-safe, cacheable capability checks** for both UI and actions.
 * They enable conditional rendering (show/hide buttons), form validation (disable fields),
 * and enforcement (throw before writes) — all from a single source of truth.
 *
 * This is the foundation of **Capability-Driven UI**: Components query capabilities without
 * knowing implementation details. Rules can leverage WordPress native capabilities
 * (`wp.data.select('core').canUser`), REST probes, or custom logic.
 *
 * ## What Capabilities Do
 *
 * Every capability runtime provides:
 * - **`can(key, params?)`** — Check capability (returns boolean, never throws)
 * - **`assert(key, params?)`** — Enforce capability (throws `CapabilityDenied` if false)
 * - **Cache management** — Automatic result caching with TTL and cross-tab sync
 * - **Event emission** — Broadcast denied events via `@wordpress/hooks` and BroadcastChannel
 * - **React integration** — `useCapability()` hook (provided by `@wpkernel/ui`) for SSR-safe conditional rendering
 * - **Action integration** — `ctx.capability.assert()` in actions for write protection
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { defineCapability } from '@wpkernel/core/capability';
 *
 * // Define capability rules
 * const capability = defineCapability<{
 *   'posts.view': void;           // No params needed
 *   'posts.edit': number;         // Requires post ID
 *   'posts.delete': number;       // Requires post ID
 * }>({
 *   'posts.view': (ctx) => {
 *     // Sync rule: immediate boolean
 *     return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
 *   },
 *   'posts.edit': async (ctx, postId) => {
 *     // Async rule: checks specific post capability
 *     const result = await ctx.adapters.wp?.canUser('update', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   },
 *   'posts.delete': async (ctx, postId) => {
 *     const result = await ctx.adapters.wp?.canUser('delete', {
 *       kind: 'postType',
 *       name: 'post',
 *       id: postId
 *     });
 *     return result ?? false;
 *   }
 * });
 *
 * // Use in actions (enforcement)
 * export const DeletePost = defineAction('Post.Delete', async (ctx, { id }) => {
 *   ctx.capability.assert('posts.delete', id); // Throws if denied
 *   await post.remove!(id);
 *   ctx.emit(post.events.deleted, { id });
 * });
 *
 * // Use in UI (conditional rendering)
 * function PostActions({ postId }: { postId: number }) {
 *   const capability = useCapability<typeof capability>();
 *   const canEdit = capability.can('posts.edit', postId);
 *   const canDelete = capability.can('posts.delete', postId);
 *
 *   return (
 *     <div>
 *       <Button disabled={!canEdit}>Edit</Button>
 *       <Button disabled={!canDelete}>Delete</Button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Caching & Performance
 *
 * Results are **automatically cached** with:
 * - **Memory cache** — Instant lookups for repeated checks
 * - **Cross-tab sync** — BroadcastChannel keeps all tabs in sync
 * - **Session storage** — Optional persistence (set `cache.storage: 'session'`)
 * - **TTL support** — Cache expires after configurable timeout (default: 60s)
 *
 * ```typescript
 * const capability = defineCapability(rules, {
 *   cache: {
 *     ttlMs: 30_000,        // 30 second cache
 *     storage: 'session',   // Persist in sessionStorage
 *     crossTab: true        // Sync across browser tabs
 *   }
 * });
 * ```
 *
 * Cache is invalidated automatically when rules change via `capability.extend()`,
 * or manually via `capability.cache.invalidate()`.
 *
 * ## WordPress Integration
 *
 * By default, capabilities auto-detect and use `wp.data.select('core').canUser()` for
 * native WordPress capability checks:
 *
 * ```typescript
 * // Automatically uses wp.data when available
 * const capability = defineCapability({
 *   'posts.edit': async (ctx, postId) => {
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
 *
 * Override adapters for custom capability systems:
 *
 * ```typescript
 * const capability = defineCapability(rules, {
 *   adapters: {
 *     wp: {
 *       canUser: async (action, resource) => {
 *         // Custom implementation (e.g., check external API)
 *         return fetch(`/api/capabilities?action=${action}`).then(r => r.json());
 *       }
 *     },
 *     restProbe: async (key) => {
 *       // Optional: probe REST endpoints for availability
 *       return fetch(`/wp-json/acme/v1/probe/${key}`).then(r => r.ok);
 *     }
 *   }
 * });
 * ```
 *
 * ## Event Emission
 *
 * When capabilities are denied, events are emitted to:
 * - **`@wordpress/hooks`** — `{namespace}.capability.denied` with full context
 * - **BroadcastChannel** — Cross-tab notification for UI synchronization
 * - **PHP bridge** — Optional server-side logging (when `bridged: true` in actions)
 *
 * ```typescript
 * // Listen for denied events
 * wp.hooks.addAction('acme.capability.denied', 'acme-plugin', (event) => {
 *   const reporter = createReporter({ namespace: 'acme.capability', channel: 'all' });
 *   reporter.warn('Capability denied:', event.capabilityKey, event.context);
 *   // Show toast notification, track in analytics, etc.
 * });
 * ```
 *
 * ## Runtime Wiring
 *
 * Capabilities are **automatically registered** with the action runtime on definition:
 *
 * ```typescript
 * // 1. Define capability (auto-registers)
 * const capability = defineCapability(rules);
 *
 * // 2. Use in actions immediately
 * const CreatePost = defineAction('Post.Create', async (ctx, args) => {
 *   ctx.capability.assert('posts.create'); // Works automatically
 *   // ...
 * });
 * ```
 *
 * For custom runtime configuration:
 *
 * ```typescript
 * globalThis.__WP_KERNEL_ACTION_RUNTIME__ = {
 *   capability: defineCapability(rules),
 *   jobs: defineJobQueue(),
 *   bridge: createPHPBridge(),
 *   reporter: createReporter()
 * };
 * ```
 *
 * ## Extending Capabilities
 *
 * Add or override rules at runtime:
 *
 * ```typescript
 * capability.extend({
 *   'posts.publish': async (ctx, postId) => {
 *     // New rule
 *     return ctx.adapters.wp?.canUser('publish_posts') ?? false;
 *   },
 *   'posts.edit': (ctx, postId) => {
 *     // Override existing rule
 *     return false; // Disable editing
 *   }
 * });
 * // Cache automatically invalidated for affected keys
 * ```
 *
 * ## Type Safety
 *
 * Capability keys and parameters are **fully typed**:
 *
 * ```typescript
 * type MyCapabilities = {
 *   'posts.view': void;          // No params
 *   'posts.edit': number;        // Requires number
 *   'posts.assign': { userId: number; postId: number }; // Requires object
 * };
 *
 * const capability = defineCapability<MyCapabilities>({ ... });
 *
 * capability.can('posts.view');           // ✅ OK
 * capability.can('posts.edit', 123);      // ✅ OK
 * capability.can('posts.edit');           // ❌ Type error: missing param
 * capability.can('posts.unknown');        // ❌ Type error: unknown key
 * ```
 *
 * ## Async vs Sync Rules
 *
 * Rules can be **synchronous** (return `boolean`) or **asynchronous** (return `Promise<boolean>`).
 * Async rules are automatically detected and cached to avoid redundant API calls:
 *
 * ```typescript
 * defineCapability({
 *   map: {
 *     'fast.check': (ctx) => true,                    // Sync: immediate
 *     'slow.check': async (ctx) => {                  // Async: cached
 *       const result = await fetch('/api/check');
 *       return result.ok;
 *     }
 *   }
 * });
 * ```
 *
 * In React components, async rules return `false` during evaluation and update when resolved.
 *
 * @template K - Capability map type defining capability keys and their parameter types
 * @param    config - Configuration object mapping capability keys to rule functions and runtime options
 * @return Capability helpers object with can(), assert(), keys(), extend(), and cache API
 * @throws DeveloperError if a rule returns non-boolean value
 * @throws CapabilityDenied when assert() called on denied capability
 * @example
 * ```typescript
 * // Minimal example (no params)
 * const capability = defineCapability({
 *   map: {
 *     'admin.access': (ctx) =>
 *       ctx.adapters.wp?.canUser('manage_options') ?? false
 *   }
 * });
 *
 * if (capability.can('admin.access')) {
 *   // Show admin menu
 * }
 * ```
 * @example
 * ```typescript
 * // With custom adapters
 * const capability = defineCapability({
 *   map: rules,
 *   options: {
 *     namespace: 'acme-plugin',
 *     adapters: {
 *       restProbe: async (key) => {
 *         const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
 *         return res.ok;
 *       }
 *     },
 *     cache: { ttlMs: 5000, storage: 'session' },
 *     debug: true // Log all capability checks
 *   }
 * });
 * ```
 */
export function defineCapability<K extends Record<string, unknown>>(
	config: CapabilityDefinitionConfig<K>
): CapabilityHelpers<K> {
	if (!config || typeof config !== 'object') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineCapability requires a configuration object with "map".',
		});
	}

	const { map, options } = config;

	if (!map || typeof map !== 'object') {
		throw new WPKernelError('DeveloperError', {
			message: 'defineCapability requires a "map" of capability rules.',
		});
	}

	const namespace = options?.namespace ?? getNamespace();
	const reporter = resolveCapabilityReporter(options?.debug, namespace);
	const cache = createCapabilityCache(options?.cache, namespace);
	const adapters = resolveAdapters(options, reporter);

	const capabilityContext: CapabilityContext = {
		namespace,
		adapters,
		cache,
		reporter,
	};

	const rules = new Map<keyof K, CapabilityRule<K[keyof K]>>();
	(Object.keys(map) as Array<keyof K>).forEach((key) => {
		rules.set(key, map[key]);
	});

	const asyncKeys = new Set<keyof K>();
	const inFlight = new Map<string, Promise<boolean>>();

	function getRule<Key extends keyof K>(key: Key): CapabilityRule<K[Key]> {
		const rule = rules.get(key);
		if (!rule) {
			const availableKeys = Array.from(rules.keys()).map(String);
			throw new WPKernelError('DeveloperError', {
				message: `Capability "${String(key)}" is not registered. Available keys: ${availableKeys.join(', ')}`,
				context: {
					requestedKey: String(key),
					availableKeys,
				},
			});
		}
		return rule as CapabilityRule<K[Key]>;
	}

	function evaluate<Key extends keyof K>(
		key: Key,
		params: ParamsOf<K, Key>[0] | undefined
	): boolean | Promise<boolean> {
		const cacheKey = createCapabilityCacheKey(String(key), params);

		if (asyncKeys.has(key)) {
			const cached = cache.get(cacheKey);
			if (typeof cached === 'boolean') {
				return cached;
			}

			const inflight = inFlight.get(cacheKey);
			if (inflight) {
				return inflight;
			}
		}

		const rule = getRule(key);
		const result = rule(capabilityContext, params as K[Key]);

		if (result instanceof Promise) {
			asyncKeys.add(key);
			const promise = result
				.then((value) => {
					ensureBoolean(value, String(key));
					cache.set(cacheKey, value);
					inFlight.delete(cacheKey);
					return value;
				})
				.catch((error) => {
					inFlight.delete(cacheKey);
					throw error;
				});
			inFlight.set(cacheKey, promise);
			return promise;
		}

		ensureBoolean(result, String(key));
		return result;
	}

	const helpers: CapabilityHelpers<K> = {
		can<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): boolean | Promise<boolean> {
			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			return evaluate(key, param);
		},
		assert<Key extends keyof K>(
			key: Key,
			...params: ParamsOf<K, Key>
		): void | Promise<void> {
			const param = params[0] as ParamsOf<K, Key>[0] | undefined;
			// Capture request context immediately to prevent race conditions
			// in concurrent capability checks (see PR #60 review comment)
			const capturedContext = getCapabilityRequestContext();

			const outcome = evaluate(key, param);
			if (outcome instanceof Promise) {
				return outcome.then((allowed) => {
					if (!allowed) {
						const { error, messageKey, context } =
							createDeniedError(namespace, String(key), param);
						emitCapabilityDenied(
							namespace,
							{
								capabilityKey: String(key),
								context,
								messageKey,
							},
							capturedContext
						);
						throw error;
					}
				});
			}

			if (!outcome) {
				const { error, messageKey, context } = createDeniedError(
					namespace,
					String(key),
					param
				);
				emitCapabilityDenied(
					namespace,
					{
						capabilityKey: String(key),
						context,
						messageKey,
					},
					capturedContext
				);
				throw error;
			}
		},
		keys(): (keyof K)[] {
			return Array.from(rules.keys());
		},
		extend(additionalMap: Partial<CapabilityMap<K>>): void {
			(Object.keys(additionalMap) as Array<keyof K>).forEach((key) => {
				const rule = additionalMap[key];
				if (typeof rule !== 'function') {
					return;
				}

				if (rules.has(key) && process.env.NODE_ENV !== 'production') {
					getCapabilityModuleReporter().warn(
						`Capability "${String(key)}" is being overridden via extend().`,
						{ capabilityKey: String(key) }
					);
				}

				rules.set(key, rule);
				asyncKeys.delete(key);
				cache.invalidate(String(key));
			});
		},
		cache,
	};

	const runtime = getCapabilityRuntime();
	if (runtime) {
		runtime.capability = helpers as CapabilityHelpers<
			Record<string, unknown>
		>;
	} else {
		(
			globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown }
		).__WP_KERNEL_ACTION_RUNTIME__ = {
			capability: helpers as CapabilityHelpers<Record<string, unknown>>,
		};
	}

	return helpers;
}
