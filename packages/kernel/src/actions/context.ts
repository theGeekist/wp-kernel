/**
 * Internal helpers for constructing action execution context.
 */

import { KernelError } from '../error/KernelError';
import { invalidate as invalidateCache } from '../resource/cache';
import { getNamespace } from '../namespace/detect';
import type {
	ActionContext,
	ActionLifecycleEvent,
	ActionLifecycleEventBase,
	ActionOptions,
	ActionRuntime,
	Reporter,
	ResolvedActionOptions,
} from './types';

/**
 * Broadcast channel name for cross-tab action events.
 */
const BROADCAST_CHANNEL_NAME = 'wpk.actions';

let broadcastChannel: BroadcastChannel | null | undefined;

/**
 * Lazily resolve the runtime configuration provided by host applications.
 */
function getRuntime(): ActionRuntime | undefined {
	return globalThis.__WP_KERNEL_ACTION_RUNTIME__;
}

/**
 * Retrieve WordPress hooks if available.
 */
type WordPressHooks = {
	doAction: (eventName: string, payload: unknown) => void;
};

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
 * Resolve action options by applying defaults.
 * @param options
 */
export function resolveOptions(
	options: ActionOptions = {}
): ResolvedActionOptions {
	const scope = options.scope ?? 'crossTab';
	const bridged = scope === 'tabLocal' ? false : (options.bridged ?? true);
	return { scope, bridged };
}

/**
 * Generate a request identifier for action invocations.
 */
export function generateActionRequestId(): string {
	return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Resolve reporter implementation.
 * @param runtime
 */
function createReporter(runtime?: ActionRuntime): Reporter {
	if (runtime?.reporter) {
		return runtime.reporter;
	}

	return {
		info(message, context) {
			console.info(`[wp-kernel] ${message}`, context ?? '');
		},
		warn(message, context) {
			console.warn(`[wp-kernel] ${message}`, context ?? '');
		},
		error(message, context) {
			console.error(`[wp-kernel] ${message}`, context ?? '');
		},
		debug(message, context) {
			console.debug(`[wp-kernel] ${message}`, context ?? '');
		},
	};
}

/**
 * Resolve policy helpers with sensible defaults.
 * @param actionName
 * @param runtime
 */
function createPolicy(actionName: string, runtime?: ActionRuntime) {
	const policy = runtime?.policy;
	let warned = false;

	return {
		assert(capability: string) {
			if (policy?.assert) {
				policy.assert(capability);
				return;
			}
			throw new KernelError('DeveloperError', {
				message: `Action \"${actionName}\" attempted to assert capability \"${capability}\" without a policy runtime configured.`,
			});
		},
		can(capability: string) {
			if (policy?.can) {
				return policy.can(capability);
			}
			if (!warned && process.env.NODE_ENV !== 'production') {
				console.warn(
					`Action "${actionName}" called policy.can('${capability}') but no policy runtime is configured.`
				);
				warned = true;
			}
			return false;
		},
	};
}

/**
 * Resolve background job helpers with defaults that surface actionable errors.
 * @param actionName
 * @param runtime
 */
function createJobs(actionName: string, runtime?: ActionRuntime) {
	if (runtime?.jobs) {
		return runtime.jobs;
	}

	return {
		async enqueue(jobName: string): Promise<void> {
			throw new KernelError('NotImplementedError', {
				message: `Action \"${actionName}\" attempted to enqueue job \"${jobName}\" but no jobs runtime is configured.`,
			});
		},
		async wait(jobName: string): Promise<never> {
			throw new KernelError('NotImplementedError', {
				message: `Action \"${actionName}\" attempted to wait on job \"${jobName}\" but no jobs runtime is configured.`,
			});
		},
	};
}

/**
 * Emit lifecycle events via hooks and optional bridge runtime.
 * @param event
 */
export function emitLifecycleEvent(event: ActionLifecycleEvent): void {
	const hooks = getHooks();
	if (hooks?.doAction) {
		hooks.doAction(`wpk.action.${event.phase}`, event);
	}

	const runtime = getRuntime();
	if (runtime?.bridge?.emit) {
		runtime.bridge.emit(`wpk.action.${event.phase}`, event, event);
	}

	if (event.scope === 'crossTab') {
		const channel = getBroadcastChannel();
		channel?.postMessage({ type: 'wpk.action.lifecycle', event });
	}
}

/**
 * Lazily construct or reuse a BroadcastChannel instance.
 */
function getBroadcastChannel(): BroadcastChannel | null {
	if (broadcastChannel !== undefined) {
		return broadcastChannel;
	}

	if (
		typeof window === 'undefined' ||
		typeof window.BroadcastChannel !== 'function'
	) {
		broadcastChannel = null;
		return broadcastChannel;
	}

	broadcastChannel = new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
	return broadcastChannel;
}

/**
 * Emit a domain event respecting action scope and optional bridge.
 * @param eventName
 * @param payload
 * @param metadata
 */
function emitDomainEvent(
	eventName: string,
	payload: unknown,
	metadata: ActionLifecycleEventBase
) {
	if (!eventName || typeof eventName !== 'string') {
		throw new KernelError('DeveloperError', {
			message: 'ctx.emit requires a non-empty string event name.',
		});
	}

	const eventMetadata: ActionLifecycleEventBase = {
		...metadata,
		timestamp: Date.now(),
	};

	const hooks = getHooks();
	if (hooks?.doAction) {
		hooks.doAction(eventName, payload);
	}

	const runtime = getRuntime();
	if (eventMetadata.bridged && runtime?.bridge?.emit) {
		runtime.bridge.emit(eventName, payload, eventMetadata);
	}

	if (eventMetadata.scope === 'crossTab') {
		const channel = getBroadcastChannel();
		channel?.postMessage({
			type: 'wpk.action.event',
			event: eventName,
			payload,
			metadata: eventMetadata,
		});
	}
}

/**
 * Build the action execution context exposed to userland implementations.
 * @param actionName
 * @param requestId
 * @param options
 */
export function createActionContext(
	actionName: string,
	requestId: string,
	options: ResolvedActionOptions
): ActionContext {
	const runtime = getRuntime();
	const namespace = getNamespace();
	const metadata: ActionLifecycleEventBase = {
		actionName,
		requestId,
		namespace,
		scope: options.scope,
		bridged: options.bridged,
		timestamp: Date.now(),
	};

	const reporter = createReporter(runtime);
	const policy = createPolicy(actionName, runtime);
	const jobs = createJobs(actionName, runtime);

	return {
		requestId,
		namespace,
		reporter,
		policy,
		jobs,
		emit(eventName, payload) {
			emitDomainEvent(eventName, payload, metadata);
		},
		invalidate(patterns, opts) {
			invalidateCache(patterns, opts);
		},
	};
}

export { getHooks };
