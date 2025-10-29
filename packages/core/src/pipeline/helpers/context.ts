import type { Reporter } from '../../reporter/types';
import type {
	ActionDefinedEvent,
	ResourceDefinedEvent,
} from '../../events/bus';

/**
 * Shared registry hooks surfaced to pipeline helpers.
 */
export interface CorePipelineRegistryBridge {
	/**
	 * Record an action definition once helper orchestration completes.
	 */
	readonly recordActionDefined?: (event: ActionDefinedEvent) => void;
	/**
	 * Record a resource definition once helper orchestration completes.
	 */
	readonly recordResourceDefined?: (event: ResourceDefinedEvent) => void;
}

/**
 * Context contract shared across core pipeline helpers.
 */
export interface CorePipelineContext {
	/** Structured reporter instance used for diagnostics. */
	reporter: Reporter;
	/** Namespace owning the resource or action under orchestration. */
	namespace: string;
	/** Optional registry bridge helpers surfaced to pipeline extensions. */
	readonly registry?: CorePipelineRegistryBridge;
}
