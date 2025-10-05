import { KernelError } from '../error/KernelError';
import { getNamespace } from '../namespace/detect';
import { createPolicyCache, createPolicyCacheKey } from './cache';
import { getPolicyRequestContext, getPolicyRuntime } from './context';
import type {
	ParamsOf,
	PolicyAdapters,
	PolicyContext,
	PolicyHelpers,
	PolicyMap,
	PolicyOptions,
	PolicyReporter,
	PolicyRule,
	PolicyDeniedEvent,
} from './types';

const POLICY_EVENT_CHANNEL = 'wpk.policy.events';

interface WordPressHooks {
	doAction: (eventName: string, payload: unknown) => void;
}

let eventChannel: BroadcastChannel | null | undefined;

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
		console.warn(
			'[wp-kernel] Failed to create BroadcastChannel for policy events.',
			error
		);
		eventChannel = null;
	}

	return eventChannel;
}

function createReporter(debug?: boolean): PolicyReporter {
	if (!debug) {
		return {
			info: () => undefined,
			warn: () => undefined,
			error: () => undefined,
			debug: () => undefined,
		};
	}

	return {
		info(message, context) {
			console.info(`[wp-kernel][policy] ${message}`, context ?? '');
		},
		warn(message, context) {
			console.warn(`[wp-kernel][policy] ${message}`, context ?? '');
		},
		error(message, context) {
			console.error(`[wp-kernel][policy] ${message}`, context ?? '');
		},
		debug(message, context) {
			console.debug(`[wp-kernel][policy] ${message}`, context ?? '');
		},
	};
}

function resolveAdapters(
	options: PolicyOptions | undefined,
	reporter: PolicyReporter
): PolicyAdapters {
	const adapters = options?.adapters ?? {};
	const resolvedWp = adapters.wp ?? detectWpCanUser(reporter);
	return {
		wp: resolvedWp,
		restProbe: adapters.restProbe,
	};
}

function detectWpCanUser(reporter: PolicyReporter) {
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
function ensureBoolean(value: unknown, key: string): asserts value is boolean {
	if (typeof value !== 'boolean') {
		throw new KernelError('DeveloperError', {
			message: `Policy "${key}" must return a boolean. Received ${typeof value}.`,
		});
	}
}

function buildContext(
	policyKey: string,
	params: unknown
): Record<string, unknown> {
	const context = getPolicyRequestContext();
	const base: Record<string, unknown> = {
		policyKey,
	};

	if (context?.requestId) {
		base.requestId = context.requestId;
	}

	if (params && typeof params === 'object') {
		Object.assign(base, params as Record<string, unknown>);
	} else if (params !== undefined) {
		base.value = params;
	}

	return base;
}

function emitPolicyDenied(
	namespace: string,
	payload: Omit<PolicyDeniedEvent, 'timestamp'>
) {
	const requestContext = getPolicyRequestContext();
	const resolvedNamespace = requestContext?.namespace ?? namespace;
	const hooks = getHooks();
	const channel = getEventChannel();
	const timestamp = Date.now();
	const eventPayload: PolicyDeniedEvent = {
		...payload,
		timestamp,
		requestId: payload.requestId ?? requestContext?.requestId,
	};

	const eventName = `${resolvedNamespace}.policy.denied`;
	hooks?.doAction(eventName, eventPayload);
	channel?.postMessage({
		type: 'policy.denied',
		namespace: resolvedNamespace,
		payload: eventPayload,
	});

	if (requestContext?.bridged) {
		const runtime = getPolicyRuntime();
		runtime?.bridge?.emit?.(
			`${resolvedNamespace}.bridge.policy.denied`,
			eventPayload,
			{
				...requestContext,
				timestamp,
			}
		);
	}
}

function createDeniedError(
	namespace: string,
	policyKey: string,
	params: unknown
) {
	const messageKey = `policy.denied.${namespace}.${policyKey}`;
	const context = buildContext(policyKey, params);
	const error = new KernelError('PolicyDenied', {
		message: `Policy "${policyKey}" denied.`,
		context,
	});

	(error as KernelError & { messageKey?: string }).messageKey = messageKey;
	return { error, messageKey, context };
}

export function definePolicy<K extends Record<string, unknown>>(
	map: PolicyMap<K>,
	options?: PolicyOptions
): PolicyHelpers<K> {
	const namespace = options?.namespace ?? getNamespace();
	const reporter = createReporter(options?.debug);
	const cache = createPolicyCache(options?.cache, namespace);
	const adapters = resolveAdapters(options, reporter);

	const policyContext: PolicyContext = {
		namespace,
		adapters,
		cache,
		reporter,
	};

	const rules = new Map<keyof K, PolicyRule<K[keyof K]>>();
	(Object.keys(map) as Array<keyof K>).forEach((key) => {
		rules.set(key, map[key]);
	});

	const asyncKeys = new Set<keyof K>();
	const inFlight = new Map<string, Promise<boolean>>();

	function getRule<Key extends keyof K>(key: Key): PolicyRule<K[Key]> {
		const rule = rules.get(key);
		if (!rule) {
			throw new KernelError('DeveloperError', {
				message: `Policy "${String(key)}" is not registered.`,
			});
		}
		return rule as PolicyRule<K[Key]>;
	}

	function evaluate<Key extends keyof K>(
		key: Key,
		params: ParamsOf<K, Key>[0] | undefined
	): boolean | Promise<boolean> {
		const cacheKey = createPolicyCacheKey(String(key), params);

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
		const result = rule(policyContext, params as K[Key]);

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

	const helpers: PolicyHelpers<K> = {
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
			const outcome = evaluate(key, param);
			if (outcome instanceof Promise) {
				return outcome.then((allowed) => {
					if (!allowed) {
						const { error, messageKey, context } =
							createDeniedError(namespace, String(key), param);
						emitPolicyDenied(namespace, {
							policyKey: String(key),
							context,
							messageKey,
						});
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
				emitPolicyDenied(namespace, {
					policyKey: String(key),
					context,
					messageKey,
				});
				throw error;
			}
		},
		keys(): (keyof K)[] {
			return Array.from(rules.keys());
		},
		extend(additionalMap: Partial<PolicyMap<K>>): void {
			(Object.keys(additionalMap) as Array<keyof K>).forEach((key) => {
				const rule = additionalMap[key];
				if (typeof rule !== 'function') {
					return;
				}

				if (rules.has(key) && process.env.NODE_ENV !== 'production') {
					console.warn(
						`Policy "${String(key)}" is being overridden via extend().`
					);
				}

				rules.set(key, rule);
				asyncKeys.delete(key);
				cache.invalidate(String(key));
			});
		},
		cache,
	};

	const runtime = getPolicyRuntime();
	if (runtime) {
		runtime.policy = helpers as PolicyHelpers<Record<string, unknown>>;
	} else {
		(
			globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: unknown }
		).__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: helpers as PolicyHelpers<Record<string, unknown>>,
		};
	}

	return helpers;
}
