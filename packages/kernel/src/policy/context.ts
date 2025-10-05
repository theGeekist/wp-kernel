import { KernelError } from '../error/KernelError';
import type { ActionRuntime } from '../actions/types';
import type { PolicyHelpers } from './types';

export interface PolicyProxyOptions {
	actionName: string;
	requestId: string;
	namespace: string;
	scope: 'crossTab' | 'tabLocal';
	bridged: boolean;
}

type PolicyRequestContext = PolicyProxyOptions;

let currentContext: PolicyRequestContext | undefined;

export function getPolicyRuntime(): ActionRuntime | undefined {
	return globalThis.__WP_KERNEL_ACTION_RUNTIME__;
}

export function getPolicyRequestContext(): PolicyRequestContext | undefined {
	return currentContext;
}

export function withPolicyRequestContext<T>(
	context: PolicyRequestContext,
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

export function createPolicyProxy(
	options: PolicyProxyOptions
): Pick<PolicyHelpers<Record<string, unknown>>, 'assert' | 'can'> {
	let warned = false;

	function resolvePolicy(): Partial<PolicyHelpers<Record<string, unknown>>> {
		const runtime = getPolicyRuntime();
		if (runtime?.policy) {
			return runtime.policy;
		}

		throw new KernelError('DeveloperError', {
			message: `Action "${options.actionName}" attempted to assert a policy without a policy runtime configured.`,
		});
	}

	return {
		assert(key: string, ...params: unknown[]): void | Promise<void> {
			const runtimePolicy = resolvePolicy();
			return withPolicyRequestContext(options, () => {
				const normalizedParams =
					params.length === 0
						? ([] as never[])
						: ([params[0]] as never[]);

				if (runtimePolicy.assert) {
					const assertFn = runtimePolicy.assert as (
						policyKey: string,
						param?: unknown
					) => void | Promise<void>;
					if (normalizedParams.length === 0) {
						return assertFn(key, undefined);
					}
					return assertFn(key, normalizedParams[0]);
				}

				if (runtimePolicy.can) {
					const canFn = runtimePolicy.can as (
						policyKey: string,
						param?: unknown
					) => boolean | Promise<boolean>;
					const result =
						normalizedParams.length === 0
							? canFn(key)
							: canFn(key, normalizedParams[0]);
					if (result instanceof Promise) {
						return result.then((allowed) => {
							if (!allowed) {
								throw new KernelError('PolicyDenied', {
									message: `Policy "${key}" denied by runtime can().`,
									context: {
										policyKey: key,
										requestId: options.requestId,
									},
								});
							}
						});
					}

					if (!result) {
						throw new KernelError('PolicyDenied', {
							message: `Policy "${key}" denied by runtime can().`,
							context: {
								policyKey: key,
								requestId: options.requestId,
							},
						});
					}
					return;
				}

				throw new KernelError('DeveloperError', {
					message: `Action "${options.actionName}" attempted to assert policy "${key}" but runtime does not expose assert().`,
				});
			});
		},
		can(key: string, ...params: unknown[]): boolean | Promise<boolean> {
			const runtimePolicy = getPolicyRuntime()?.policy;
			if (!runtimePolicy?.can) {
				if (!warned && process.env.NODE_ENV !== 'production') {
					console.warn(
						`Action "${options.actionName}" called policy.can('${key}') but no policy runtime is configured.`
					);
					warned = true;
				}
				return false;
			}
			const normalizedParams =
				params.length === 0
					? ([] as never[])
					: ([params[0]] as never[]);
			const canFn = runtimePolicy.can as (
				policyKey: string,
				param?: unknown
			) => boolean | Promise<boolean>;
			if (normalizedParams.length === 0) {
				return canFn(key);
			}
			return canFn(key, normalizedParams[0]);
		},
	};
}
