/**
 * Policy module type definitions.
 *
 * These types describe the runtime contract for declarative capability policies.
 * Policies are evaluated both within actions (for enforcement) and within UI hooks
 * (for conditional rendering). All enforcement flows through strongly typed helpers
 * produced by `definePolicy()`.
 */

/**
 * Reporter interface used for structured diagnostics from the policy runtime.
 * Mirrors the reporter surface used by actions but is defined locally to avoid
 * circular type dependencies.
 */
export interface PolicyReporter {
	info: (message: string, context?: Record<string, unknown>) => void;
	warn: (message: string, context?: Record<string, unknown>) => void;
	error: (message: string, context?: Record<string, unknown>) => void;
	debug?: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Policy rule signature.
 *
 * @template P - Parameters required by the rule. `void` indicates no params.
 */
export type PolicyRule<P = void> = (
	ctx: PolicyContext,
	params: P
) => boolean | Promise<boolean>;

/**
 * Mapping from policy key to rule implementation.
 */
export type PolicyMap<Keys extends Record<string, unknown>> = {
	[K in keyof Keys]: PolicyRule<Keys[K]>;
};

/**
 * Extract the tuple type used for params in `can`/`assert` helpers.
 * Ensures that void params are optional while others remain required.
 */
export type ParamsOf<K, Key extends keyof K> = K[Key] extends void
	? []
	: [K[Key]];

/**
 * Cache storage options for policy evaluations.
 */
export interface PolicyCacheOptions {
	ttlMs?: number;
	storage?: 'memory' | 'session';
	crossTab?: boolean;
}

/**
 * Entry stored in the policy cache.
 */
export interface PolicyCacheEntry {
	value: boolean;
	expiresAt: number;
}

/**
 * Minimal cache contract used by the policy runtime and React hook.
 */
export interface PolicyCache {
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
	invalidate: (policyKey?: string) => void;
	clear: () => void;
	keys: () => string[];
	subscribe: (listener: () => void) => () => void;
	getSnapshot: () => number;
}

/**
 * Adapters that policy rules can leverage when evaluating capabilities.
 */
export interface PolicyAdapters {
	wp?: {
		canUser: (
			action: 'create' | 'read' | 'update' | 'delete',
			resource:
				| { path: string }
				| { kind: 'postType'; name: string; id?: number }
		) => boolean | Promise<boolean>;
	};
	restProbe?: (key: string) => Promise<boolean>;
}

/**
 * Policy evaluation context passed to every rule.
 */
export interface PolicyContext {
	namespace: string;
	adapters: PolicyAdapters;
	cache: PolicyCache;
	reporter?: PolicyReporter;
}

/**
 * Additional options accepted by `definePolicy()`.
 */
export interface PolicyOptions {
	namespace?: string;
	adapters?: PolicyAdapters;
	cache?: PolicyCacheOptions;
	debug?: boolean;
}

/**
 * Runtime helpers exposed by `definePolicy()`.
 */
export interface PolicyHelpers<K extends Record<string, unknown>> {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean | Promise<boolean>;
	assert: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => void | Promise<void>;
	keys: () => (keyof K)[];
	extend: (additionalMap: Partial<PolicyMap<K>>) => void;
	readonly cache: PolicyCache;
}

/**
 * Payload emitted with `{namespace}.policy.denied` events.
 */
export interface PolicyDeniedEvent {
	policyKey: string;
	context?: Record<string, unknown>;
	requestId?: string;
	timestamp: number;
	reason?: string;
	messageKey?: string;
}

/**
 * Result returned by the `usePolicy()` hook.
 */
export interface UsePolicyResult<K extends Record<string, unknown>> {
	can: <Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	) => boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
}
