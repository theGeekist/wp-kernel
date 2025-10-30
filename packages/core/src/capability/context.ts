/**
 * Capability context management and action integration
 *
 * This module provides the capability proxy pattern used in actions via `ctx.capability.assert()`.
 * It handles:
 * - Request context propagation (actionName, requestId for event correlation)
 * - Capability runtime resolution from global action runtime
 * - Event enrichment with request metadata for denied capabilities
 * - Graceful degradation when capability runtime is unavailable
 *
 * The proxy ensures capability checks in actions include full request context in events,
 * enabling audit trails and debugging (e.g., "which action triggered this denial?").
 *
 * @module @wpkernel/core/capability/context
 */

import { WPKernelError } from '../error/WPKernelError';
import type { ActionRuntime } from '../actions/types';
import { createReporter } from '../reporter';
import { resolveReporter } from '../reporter/resolve';
import { WPK_SUBSYSTEM_NAMESPACES } from '../contracts/index.js';
import type { CapabilityHelpers } from './types';

export type CapabilityProxyOptions = {
	actionName: string;
	requestId: string;
	namespace: string;
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
};

type CapabilityRequestContext = CapabilityProxyOptions;

let currentContext: CapabilityRequestContext | undefined;
function getCapabilityContextReporter() {
	return resolveReporter({
		fallback: () =>
			createReporter({
				namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY,
				channel: 'console',
				level: 'warn',
			}),
		cache: true,
		cacheKey: `${WPK_SUBSYSTEM_NAMESPACES.POLICY}.context`,
	});
}

export function getCapabilityRuntime(): ActionRuntime | undefined {
	return globalThis.__WP_KERNEL_ACTION_RUNTIME__;
}

export function getCapabilityRequestContext():
	| CapabilityRequestContext
	| undefined {
	return currentContext;
}

export function withCapabilityRequestContext<T>(
	context: CapabilityRequestContext,
	fn: () => T
): T {
	const previous = currentContext;
	currentContext = context;
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result.finally(() => {
				currentContext = previous;
			}) as unknown as T;
		}
		currentContext = previous;
		return result;
	} catch (error) {
		currentContext = previous;
		throw error;
	}
}

export function createCapabilityProxy(
	options: CapabilityProxyOptions
): Pick<CapabilityHelpers<Record<string, unknown>>, 'assert' | 'can'> {
	let warned = false;

	/**
	 * Normalize params array to single value or empty array.
	 *
	 * @param params - Variadic params from can/assert calls
	 * @return Empty array or array with single param value
	 * @internal
	 */
	function normalizeParams(params: unknown[]): [] | [unknown] {
		return params.length === 0 ? [] : [params[0]];
	}

	function resolveCapability(): Partial<
		CapabilityHelpers<Record<string, unknown>>
	> {
		const runtime = getCapabilityRuntime();
		if (runtime?.capability) {
			return runtime.capability;
		}

		throw new WPKernelError('DeveloperError', {
			message: `Action "${options.actionName}" attempted to assert a capability without a capability runtime configured.`,
		});
	}

	return {
		assert(key: string, ...params: unknown[]): void | Promise<void> {
			const runtimeCapability = resolveCapability();
			return withCapabilityRequestContext(options, () => {
				const normalizedParams = normalizeParams(params) as never[];

				if (runtimeCapability.assert) {
					const assertFn = runtimeCapability.assert as (
						capabilityKey: string,
						param?: unknown
					) => void | Promise<void>;
					if (normalizedParams.length === 0) {
						return assertFn(key, undefined);
					}
					return assertFn(key, normalizedParams[0]);
				}

				if (runtimeCapability.can) {
					const canFn = runtimeCapability.can as (
						capabilityKey: string,
						param?: unknown
					) => boolean | Promise<boolean>;
					const result =
						normalizedParams.length === 0
							? canFn(key)
							: canFn(key, normalizedParams[0]);
					if (result instanceof Promise) {
						return result.then((allowed) => {
							if (!allowed) {
								throw new WPKernelError('CapabilityDenied', {
									message: `Capability "${key}" denied by runtime can().`,
									context: {
										capabilityKey: key,
										requestId: options.requestId,
									},
								});
							}
						});
					}

					if (!result) {
						throw new WPKernelError('CapabilityDenied', {
							message: `Capability "${key}" denied by runtime can().`,
							context: {
								capabilityKey: key,
								requestId: options.requestId,
							},
						});
					}
					return;
				}

				throw new WPKernelError('DeveloperError', {
					message: `Action "${options.actionName}" attempted to assert capability "${key}" but runtime does not expose assert().`,
				});
			});
		},
		can(key: string, ...params: unknown[]): boolean | Promise<boolean> {
			const runtimeCapability = getCapabilityRuntime()?.capability;
			if (!runtimeCapability?.can) {
				if (!warned && process.env.NODE_ENV !== 'production') {
					getCapabilityContextReporter().warn(
						`Action "${options.actionName}" called capability.can('${key}') but no capability runtime is configured.`
					);
					warned = true;
				}
				return false;
			}
			const normalizedParams = normalizeParams(params) as never[];
			const canFn = runtimeCapability.can as (
				capabilityKey: string,
				param?: unknown
			) => boolean | Promise<boolean>;
			if (normalizedParams.length === 0) {
				return canFn(key);
			}
			return canFn(key, normalizedParams[0]);
		},
	};
}
