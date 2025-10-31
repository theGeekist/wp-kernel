/* eslint-disable jsdoc/check-tag-names -- allow Typedoc @category tags */
import type {
	ActionLifecycleEvent,
	ActionLifecycleEventBase,
	DefinedAction,
} from '../actions/types';
import type { ResourceObject } from '../resource/types';
import type { Reporter } from '../reporter';
import { createReporter } from '../reporter';
import { resolveReporter } from '../reporter/resolve';
import { WPK_SUBSYSTEM_NAMESPACES } from '../contracts/index.js';

export type ResourceDefinedEvent<T = unknown, TQuery = unknown> = {
	resource: ResourceObject<T, TQuery>;
	namespace: string;
};

type GenericResourceDefinedEvent = ResourceDefinedEvent<unknown, unknown>;

export type ActionDefinedEvent = {
	action: DefinedAction<unknown, unknown>;
	namespace: string;
};

export type ActionDomainEvent = {
	eventName: string;
	payload: unknown;
	metadata: ActionLifecycleEventBase;
};

export type CacheInvalidatedEvent = {
	keys: string[];
	storeKey?: string;
};

export type CustomKernelEvent = {
	eventName: string;
	payload: unknown;
};

export type WPKernelEventMap = {
	'resource:defined': GenericResourceDefinedEvent;
	'action:defined': ActionDefinedEvent;
	'action:start': ActionLifecycleEvent;
	'action:complete': ActionLifecycleEvent;
	'action:error': ActionLifecycleEvent;
	'action:domain': ActionDomainEvent;
	'cache:invalidated': CacheInvalidatedEvent;
	'custom:event': CustomKernelEvent;
};

type KernelEventName = keyof WPKernelEventMap;

type Listener<T> = (payload: T) => void;

/**
 * Typed event bus used across the kernel to broadcast lifecycle events and
 * cache invalidation notices.
 *
 * The bus automatically resolves a reporter so listener failures can be logged
 * during development while remaining silent in production or when reporters are
 * muted.
 */
export class WPKernelEventBus {
	private reporter: Reporter;

	constructor() {
		this.reporter = resolveReporter({
			fallback: () =>
				createReporter({
					namespace: WPK_SUBSYSTEM_NAMESPACES.EVENTS,
					channel: 'console',
					level: 'error',
				}),
			cache: true,
			cacheKey: `${WPK_SUBSYSTEM_NAMESPACES.EVENTS}.bus`,
		});
	}

	private listeners: Map<
		KernelEventName,
		Set<Listener<WPKernelEventMap[KernelEventName]>>
	> = new Map();

	/**
	 * Register a listener that remains active until the returned teardown
	 * function is called.
	 * @param event
	 * @param listener
	 */
	on<K extends KernelEventName>(
		event: K,
		listener: Listener<WPKernelEventMap[K]>
	): () => void {
		const set = this.listeners.get(event) ?? new Set();
		set.add(listener as Listener<WPKernelEventMap[KernelEventName]>);
		this.listeners.set(event, set);
		return () => {
			this.off(event, listener);
		};
	}

	/**
	 * Register a listener that runs only once for the next occurrence of
	 * the event and then tears itself down.
	 * @param event
	 * @param listener
	 */
	once<K extends KernelEventName>(
		event: K,
		listener: Listener<WPKernelEventMap[K]>
	): () => void {
		const teardown = this.on(event, (payload) => {
			teardown();
			listener(payload);
		});
		return teardown;
	}

	/**
	 * Remove a previously registered listener. Calling this method for a
	 * listener that was never registered is a no-op.
	 * @param event
	 * @param listener
	 */
	off<K extends KernelEventName>(
		event: K,
		listener: Listener<WPKernelEventMap[K]>
	): void {
		const set = this.listeners.get(event);
		if (!set) {
			return;
		}
		set.delete(listener as Listener<WPKernelEventMap[KernelEventName]>);
		if (set.size === 0) {
			this.listeners.delete(event);
		}
	}

	/**
	 * Emit the specified event and execute every registered listener. Any
	 * listener failures are reported via the resolved reporter when running
	 * outside of production.
	 * @param event
	 * @param payload
	 */
	emit<K extends KernelEventName>(
		event: K,
		payload: WPKernelEventMap[K]
	): void {
		const set = this.listeners.get(event);
		if (!set) {
			return;
		}

		for (const listener of Array.from(set)) {
			try {
				listener(payload as WPKernelEventMap[KernelEventName]);
			} catch (error) {
				if (process.env.NODE_ENV !== 'production') {
					this.reporter.error('WPKernelEventBus listener failed', {
						event,
						error,
					});
				}
			}
		}
	}
}

let sharedEventBus: WPKernelEventBus | undefined;
const definedResources: GenericResourceDefinedEvent[] = [];
const definedActions: ActionDefinedEvent[] = [];

/**
 * Return the shared kernel event bus, creating it lazily on first access.
 *
 * @category Events
 */
export function getWPKernelEventBus(): WPKernelEventBus {
	if (!sharedEventBus) {
		sharedEventBus = new WPKernelEventBus();
	}
	return sharedEventBus;
}

/**
 * Replace the shared kernel event bus. Intended for test suites that need to
 * inspect emitted events.
 *
 * @param    bus - Custom event bus instance
 * @category Events
 */
export function setWPKernelEventBus(bus: WPKernelEventBus): void {
	sharedEventBus = bus;
}

/**
 * Record a resource definition so tests and extensions can inspect which
 * resources have been registered.
 *
 * @param    event - Resource definition event payload
 * @category Events
 */
export function recordResourceDefined<T, TQuery>(
	event: ResourceDefinedEvent<T, TQuery>
): void {
	definedResources.push(event as GenericResourceDefinedEvent);
}

/**
 * Remove a previously recorded resource definition. Useful when rolling back a
 * resource registration due to pipeline failures.
 *
 * @param    event - Resource definition event payload
 * @category Events
 */
export function removeResourceDefined<T, TQuery>(
	event: ResourceDefinedEvent<T, TQuery>
): void {
	const index = definedResources.findIndex(
		(existing) =>
			existing.namespace === event.namespace &&
			existing.resource === event.resource
	);

	if (index === -1) {
		return;
	}

	definedResources.splice(index, 1);
}

/**
 * Record an action definition for inspection in tests and tooling.
 *
 * @param    event - Action definition metadata emitted by the pipeline
 * @category Events
 */
export function recordActionDefined(event: ActionDefinedEvent): void {
	definedActions.push(event);
}

/**
 * Retrieve a shallow copy of all recorded resource definitions.
 *
 * @category Events
 */
export function getRegisteredResources(): GenericResourceDefinedEvent[] {
	return [...definedResources];
}

/**
 * Retrieve a shallow copy of all recorded action definitions.
 *
 * @category Events
 */
export function getRegisteredActions(): ActionDefinedEvent[] {
	return [...definedActions];
}

/**
 * Clear the tracked resource definitions. Primarily used in test setup and
 * teardown.
 *
 * @category Events
 */
export function clearRegisteredResources(): void {
	definedResources.length = 0;
}

/**
 * Clear the tracked action definitions. Primarily used in test setup and
 * teardown.
 *
 * @category Events
 */
export function clearRegisteredActions(): void {
	definedActions.length = 0;
}

/* eslint-enable jsdoc/check-tag-names */
