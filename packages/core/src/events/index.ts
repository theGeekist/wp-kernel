/**
 * Kernel event bus utilities and canonical event registry.
 *
 * @module @wpkernel/core/events
 */

export {
	WPKernelEventBus,
	getWPKernelEventBus,
	setWPKernelEventBus,
	getRegisteredResources,
	getRegisteredActions,
	clearRegisteredResources,
	clearRegisteredActions,
} from './bus.js';

export type {
	WPKernelEventMap,
	ResourceDefinedEvent,
	GenericResourceDefinedEvent,
	ActionDefinedEvent,
	ActionDomainEvent,
	CacheInvalidatedEvent,
	CustomKernelEvent,
	Listener,
} from './bus.js';
