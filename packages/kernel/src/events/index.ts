/**
 * Kernel event bus utilities and canonical event registry.
 *
 * @module @geekist/wp-kernel/events
 */

export {
	KernelEventBus,
	getKernelEventBus,
	setKernelEventBus,
	getRegisteredResources,
	getRegisteredActions,
	clearRegisteredResources,
	clearRegisteredActions,
} from './bus.js';

export type {
	KernelEventMap,
	ResourceDefinedEvent,
	ActionDefinedEvent,
	ActionDomainEvent,
	CacheInvalidatedEvent,
	CustomKernelEvent,
} from './bus.js';
