import { useEffect } from 'react';
import { createNoopReporter } from '@wpkernel/core/reporter';
import type { Reporter } from '@wpkernel/core/reporter';
import { WPK_INFRASTRUCTURE } from '@wpkernel/core/namespace';
import type {
	DataViewsControllerRuntime,
	DataViewsRuntimeContext,
} from '../types';
import type {
	DataViewActionTriggeredPayload,
	DataViewBoundaryTransitionPayload,
	DataViewChangedPayload,
	DataViewFetchFailedPayload,
	DataViewPermissionDeniedPayload,
	DataViewRegisteredPayload,
	DataViewsEventEmitter,
} from '../../runtime/dataviews/events';
import {
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_BOUNDARY_TRANSITION,
	DATA_VIEWS_EVENT_FETCH_FAILED,
	DATA_VIEWS_EVENT_PERMISSION_DENIED,
	DATA_VIEWS_EVENT_REGISTERED,
	DATA_VIEWS_EVENT_UNREGISTERED,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
} from '../../runtime/dataviews/events';

type ObservableRuntime =
	| DataViewsControllerRuntime
	| DataViewsRuntimeContext
	| undefined;

type WordPressHooks = {
	addAction?: (
		hookName: string,
		namespace: string,
		callback: (payload: unknown) => void,
		priority?: number
	) => void;
	removeAction?: (
		hookName: string,
		namespace: string,
		callback: (payload: unknown) => void
	) => void;
	doAction?: (hookName: string, payload: unknown) => void;
};

let cachedHooks: WordPressHooks | null | undefined;
let bridgeSeq = 0;
const DEFAULT_BRIDGE_NS = WPK_INFRASTRUCTURE.WP_HOOKS_NAMESPACE_UI_DATAVIEWS;

function resolveWordPressHooks(): WordPressHooks | undefined {
	if (cachedHooks !== undefined) {
		return cachedHooks ?? undefined;
	}
	const candidate = (globalThis as { wp?: { hooks?: WordPressHooks } }).wp
		?.hooks;
	if (candidate && typeof candidate === 'object') {
		cachedHooks = candidate;
		return candidate;
	}
	cachedHooks = null;
	return undefined;
}

function isControllerRuntime(
	runtime: ObservableRuntime
): runtime is DataViewsControllerRuntime {
	return Boolean(runtime && 'events' in runtime && runtime.events);
}

function resolveEmitter(runtime: ObservableRuntime): DataViewsEventEmitter {
	if (isControllerRuntime(runtime)) {
		return runtime.events;
	}
	if (runtime && 'dataviews' in runtime && runtime.dataviews) {
		return runtime.dataviews.events;
	}
	throw new Error('DataViews runtime does not expose an events emitter.');
}

function resolveReporter(
	runtime: ObservableRuntime,
	fallback?: Reporter
): Reporter {
	if (fallback) {
		return fallback;
	}
	if (isControllerRuntime(runtime)) {
		return runtime.reporter;
	}
	if (runtime) {
		if (runtime.reporter) {
			return runtime.reporter;
		}
		if (runtime.dataviews?.reporter) {
			return runtime.dataviews.reporter;
		}
	}
	return createNoopReporter();
}

type DataViewsEventPayloadMap = {
	[DATA_VIEWS_EVENT_REGISTERED]: DataViewRegisteredPayload;
	[DATA_VIEWS_EVENT_UNREGISTERED]: DataViewRegisteredPayload;
	[DATA_VIEWS_EVENT_VIEW_CHANGED]: DataViewChangedPayload;
	[DATA_VIEWS_EVENT_ACTION_TRIGGERED]: DataViewActionTriggeredPayload;
	[DATA_VIEWS_EVENT_PERMISSION_DENIED]: DataViewPermissionDeniedPayload;
	[DATA_VIEWS_EVENT_FETCH_FAILED]: DataViewFetchFailedPayload;
	[DATA_VIEWS_EVENT_BOUNDARY_TRANSITION]: DataViewBoundaryTransitionPayload;
};

type DataViewsEventName = keyof DataViewsEventPayloadMap;

type Listener<TName extends DataViewsEventName> = (
	payload: DataViewsEventPayloadMap[TName]
) => void;

type Subscription<TPayload> = {
	listeners: Set<(payload: TPayload) => void>;
	original: (payload: TPayload) => void;
	bridgeCount: number;
};

const subscriptionCache = new WeakMap<
	DataViewsEventEmitter,
	Map<DataViewsEventName, Subscription<unknown>>
>();

const EMITTER_METHODS: Record<DataViewsEventName, keyof DataViewsEventEmitter> =
	{
		[DATA_VIEWS_EVENT_REGISTERED]: 'registered',
		[DATA_VIEWS_EVENT_UNREGISTERED]: 'unregistered',
		[DATA_VIEWS_EVENT_VIEW_CHANGED]: 'viewChanged',
		[DATA_VIEWS_EVENT_ACTION_TRIGGERED]: 'actionTriggered',
		[DATA_VIEWS_EVENT_PERMISSION_DENIED]: 'permissionDenied',
		[DATA_VIEWS_EVENT_FETCH_FAILED]: 'fetchFailed',
		[DATA_VIEWS_EVENT_BOUNDARY_TRANSITION]: 'boundaryChanged',
	};

function getOrCreateSubscription<TName extends DataViewsEventName>(
	emitter: DataViewsEventEmitter,
	eventName: TName,
	reporter: Reporter
): Subscription<DataViewsEventPayloadMap[TName]> {
	let emitterSubscriptions = subscriptionCache.get(emitter);
	if (!emitterSubscriptions) {
		emitterSubscriptions = new Map();
		subscriptionCache.set(emitter, emitterSubscriptions);
	}
	const existing = emitterSubscriptions.get(eventName) as
		| Subscription<DataViewsEventPayloadMap[TName]>
		| undefined;
	if (existing) {
		return existing;
	}

	const method = EMITTER_METHODS[eventName];
	const original = emitter[method] as (
		payload: DataViewsEventPayloadMap[TName]
	) => void;
	const listeners = new Set<
		(payload: DataViewsEventPayloadMap[TName]) => void
	>();
	const hooks = resolveWordPressHooks();

	const wrapped = (payload: DataViewsEventPayloadMap[TName]) => {
		listeners.forEach((handler) => {
			try {
				handler(payload);
			} catch (error) {
				reporter.error?.('Failed to process DataViews event listener', {
					event: eventName,
					error,
				});
			}
		});
		hooks?.doAction?.(eventName, payload);
		original.call(emitter, payload);
	};

	(emitter as unknown as Record<string, unknown>)[method] = wrapped as never;

	const subscription: Subscription<DataViewsEventPayloadMap[TName]> = {
		listeners,
		original,
		bridgeCount: 0,
	};
	emitterSubscriptions.set(eventName, subscription as Subscription<unknown>);
	return subscription;
}

export interface SubscribeToDataViewsEventOptions {
	reporter?: Reporter;
	wordpress?: {
		/**
		 * Unique namespace for `@wordpress/hooks`.
		 * If omitted, a unique namespace is generated per subscription using
		 * {@link WPK_INFRASTRUCTURE.WP_HOOKS_NAMESPACE_UI_DATAVIEWS} as the base:
		 * `${base}:${eventName}:${seq}`.
		 */
		namespace?: string;
		priority?: number;
	};
}

/**
 * Subscribes to a specific DataViews event and optionally bridges it to WordPress hooks.
 *
 * @template {DataViewsEventName} TName
 * @param {ObservableRuntime}                runtime   - A DataViews controller or runtime context.
 * @param {TName}                            eventName - The event name to subscribe to.
 * @param {Listener<TName>}                  listener  - Callback invoked when the event fires.
 * @param {SubscribeToDataViewsEventOptions} [options] - Optional configuration.
 * @returns {() => void} Cleanup function that unsubscribes the listener.
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToDataViewsEvent(
 *   runtime.dataviews,
 *   DATA_VIEWS_EVENT_VIEW_CHANGED,
 *   (payload) => console.log('View changed', payload)
 * );
 * ```
 */
export function subscribeToDataViewsEvent<TName extends DataViewsEventName>(
	runtime: ObservableRuntime,
	eventName: TName,
	listener: Listener<TName>,
	options: SubscribeToDataViewsEventOptions = {}
): () => void {
	if (!runtime) {
		return () => undefined;
	}

	const emitter = resolveEmitter(runtime);
	const reporter = resolveReporter(runtime, options.reporter);
	const subscription = getOrCreateSubscription(emitter, eventName, reporter);
	const hooks = resolveWordPressHooks();
	const listeners = subscription.listeners as Set<Listener<TName>>;

	// --- Internal helpers --------------------------------------------------

	/**
	 * Determines if WordPress bridging is possible and enabled.
	 */
	function canBridge(): boolean {
		return Boolean(
			options.wordpress &&
				hooks?.addAction &&
				hooks?.removeAction &&
				hooks?.doAction
		);
	}

	/**
	 * Registers the listener as a WordPress hook action.
	 */
	function registerWordPressBridge(): {
		callback: (payload: unknown) => void;
		namespace: string;
	} {
		const namespace =
			options.wordpress?.namespace ??
			`${DEFAULT_BRIDGE_NS}:${eventName}:${++bridgeSeq}`;
		const priority = options.wordpress?.priority ?? 10;

		const callback = (payload: unknown): void => {
			try {
				listener(payload as DataViewsEventPayloadMap[TName]);
			} catch (error) {
				reporter.error?.(
					'Failed to process WordPress DataViews hook listener',
					{
						event: eventName,
						error,
					}
				);
			}
		};

		hooks!.addAction?.(eventName, namespace, callback, priority);
		subscription.bridgeCount += 1;

		return { callback, namespace };
	}

	/**
	 * Restores the emitter to its original state when all listeners are removed.
	 */
	function cleanupEmitter(): void {
		const method = EMITTER_METHODS[eventName];
		(emitter as unknown as Record<string, unknown>)[method] =
			subscription.original as never;
		const emitterSubscriptions = subscriptionCache.get(emitter);
		emitterSubscriptions?.delete(eventName);
		if (emitterSubscriptions && emitterSubscriptions.size === 0) {
			subscriptionCache.delete(emitter);
		}
	}

	// --- Execution ---------------------------------------------------------

	const bridgeEnabled = canBridge();
	let bridgeInfo:
		| { callback: (payload: unknown) => void; namespace: string }
		| undefined;

	if (bridgeEnabled) {
		bridgeInfo = registerWordPressBridge();
	} else {
		listeners.add(listener);
	}

	return (): void => {
		if (bridgeEnabled && bridgeInfo) {
			hooks?.removeAction?.(
				eventName,
				bridgeInfo.namespace,
				bridgeInfo.callback
			);
			subscription.bridgeCount = Math.max(
				0,
				subscription.bridgeCount - 1
			);
		} else {
			listeners.delete(listener);
		}

		if (listeners.size === 0 && subscription.bridgeCount === 0) {
			cleanupEmitter();
		}
	};
}

export function useDataViewsEvent<TName extends DataViewsEventName>(
	runtime: ObservableRuntime,
	eventName: TName,
	listener: Listener<TName>,
	options: SubscribeToDataViewsEventOptions = {}
): void {
	useEffect(() => {
		if (!runtime) {
			return undefined;
		}
		return subscribeToDataViewsEvent(runtime, eventName, listener, options);
	}, [runtime, eventName, listener, options]);
}

export type { DataViewsEventName, DataViewsEventPayloadMap };
export const __TESTING__ = {
	resetWordPressHooksCache() {
		cachedHooks = undefined;
	},
};
