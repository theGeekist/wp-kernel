import type {
	ActionLifecycleEvent,
	ActionLifecycleEventBase,
	DefinedAction,
} from '../actions/types';
import type { ResourceObject } from '../resource/types';
import { createReporter } from '../reporter';
import { WPK_SUBSYSTEM_NAMESPACES } from '../namespace/constants';

export type ResourceDefinedEvent = {
	resource: ResourceObject<unknown, unknown>;
	namespace: string;
};

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

export type KernelEventMap = {
	'resource:defined': ResourceDefinedEvent;
	'action:defined': ActionDefinedEvent;
	'action:start': ActionLifecycleEvent;
	'action:complete': ActionLifecycleEvent;
	'action:error': ActionLifecycleEvent;
	'action:domain': ActionDomainEvent;
	'cache:invalidated': CacheInvalidatedEvent;
	'custom:event': CustomKernelEvent;
};

type KernelEventName = keyof KernelEventMap;

type Listener<T> = (payload: T) => void;

export class KernelEventBus {
	private reporter = createReporter({
		namespace: WPK_SUBSYSTEM_NAMESPACES.EVENTS,
		channel: 'console',
		level: 'error',
	});

	private listeners: Map<
		KernelEventName,
		Set<Listener<KernelEventMap[KernelEventName]>>
	> = new Map();

	on<K extends KernelEventName>(
		event: K,
		listener: Listener<KernelEventMap[K]>
	): () => void {
		const set = this.listeners.get(event) ?? new Set();
		set.add(listener as Listener<KernelEventMap[KernelEventName]>);
		this.listeners.set(event, set);
		return () => {
			this.off(event, listener);
		};
	}

	once<K extends KernelEventName>(
		event: K,
		listener: Listener<KernelEventMap[K]>
	): () => void {
		const teardown = this.on(event, (payload) => {
			teardown();
			listener(payload);
		});
		return teardown;
	}

	off<K extends KernelEventName>(
		event: K,
		listener: Listener<KernelEventMap[K]>
	): void {
		const set = this.listeners.get(event);
		if (!set) {
			return;
		}
		set.delete(listener as Listener<KernelEventMap[KernelEventName]>);
		if (set.size === 0) {
			this.listeners.delete(event);
		}
	}

	emit<K extends KernelEventName>(
		event: K,
		payload: KernelEventMap[K]
	): void {
		const set = this.listeners.get(event);
		if (!set) {
			return;
		}

		for (const listener of Array.from(set)) {
			try {
				listener(payload as KernelEventMap[KernelEventName]);
			} catch (error) {
				if (process.env.NODE_ENV !== 'production') {
					this.reporter.error('KernelEventBus listener failed', {
						event,
						error,
					});
				}
			}
		}
	}
}

let sharedEventBus: KernelEventBus | undefined;
const definedResources: ResourceDefinedEvent[] = [];
const definedActions: ActionDefinedEvent[] = [];

export function getKernelEventBus(): KernelEventBus {
	if (!sharedEventBus) {
		sharedEventBus = new KernelEventBus();
	}
	return sharedEventBus;
}

export function setKernelEventBus(bus: KernelEventBus): void {
	sharedEventBus = bus;
}

export function recordResourceDefined(event: ResourceDefinedEvent): void {
	definedResources.push(event);
}

export function recordActionDefined(event: ActionDefinedEvent): void {
	definedActions.push(event);
}

export function getRegisteredResources(): ResourceDefinedEvent[] {
	return [...definedResources];
}

export function getRegisteredActions(): ActionDefinedEvent[] {
	return [...definedActions];
}

export function clearRegisteredResources(): void {
	definedResources.length = 0;
}

export function clearRegisteredActions(): void {
	definedActions.length = 0;
}
