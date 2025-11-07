/**
 * Interactivity helpers - shared types
 *
 * The interactivity runtime bridges WPKernel helpers with the WordPress
 * `@wordpress/interactivity` package. These types centralize the contracts used
 * by `defineInteraction` so helper implementations, tests, and ambient
 * declarations all remain aligned.
 *
 * @module @wpkernel/core/interactivity/types
 */

import type { ActionEnvelope } from '../actions/middleware';
import type { DefinedAction } from '../actions/types';
import type { WPKernelRegistry } from '../data/types';
import type {
	ResourceActions,
	ResourceObject,
	ResourceState,
} from '../resource/types';

/**
 * Recursively marks an object as read-only.
 *
 * The interactivity server state is treated as immutable. This helper mirrors
 * the WordPress runtime behaviour where any mutation is performed through data
 * layer dispatchers rather than manipulating the cached state directly.
 * @public
 */
export type DeepReadonly<T> = T extends (...args: infer TArgs) => infer TResult
	? (...args: TArgs) => TResult
	: T extends object
		? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
		: T;

/**
 * Result returned by the interactivity runtime after registering a store.
 */
export type InteractivityStoreResult = Record<string, unknown>;

/**
 * Signature for retrieving server state snapshots from the runtime.
 */
export type InteractivityServerStateResolver = ((
	namespace: string
) => InteractivityServerState) & {
	subscribe?: unknown;
};

interface InteractivityCore {
	store: (
		namespace: string,
		definition?: Record<string, unknown>
	) => InteractivityStoreResult;
	getServerState: InteractivityServerStateResolver;
}

/**
 * Ambient interface exposed by `@wordpress/interactivity`.
 */
export interface InteractivityModule
	extends InteractivityCore,
		Record<string, unknown> {}

/**
 * Immutable snapshot of the WordPress interactivity runtime state.
 * @public
 */
export type InteractivityServerState = DeepReadonly<Record<string, unknown>>;

/**
 * Shape of the global object when running inside Jest or a browser.
 */
export interface InteractivityGlobal {
	__WPKernelInteractivityStub?: InteractivityModule;
	wp?: {
		interactivity?: InteractivityModule;
	};
}

/**
 * Dispatch envelope signature used to invoke registered actions.
 */
export type InvokeDispatch = <TArgs, TResult>(
	envelope: ActionEnvelope<TArgs, TResult>
) => Promise<TResult>;

/**
 * Extracted subset of the WordPress data dispatcher relevant to resources.
 */
export type ResourceDispatcher<TEntity> =
	| Partial<ResourceActions<TEntity>>
	| undefined;

/**
 * Convenience mapping of resource entity identifiers to cached entities.
 */
export type ResourceSnapshotItems<TEntity> = Record<
	string | number,
	TEntity | undefined
>;

/**
 * Synchronizes a resource cache with a snapshot from server state.
 * @public
 */
export type ResourceCacheSync<TEntity> = (
	snapshot: Partial<ResourceState<TEntity>>
) => void;

/**
 * Optional metadata resolver attached to interaction action bindings.
 */
export type InteractionActionMetaResolver<TArgs> = (
	args: TArgs
) => Record<string, unknown> | undefined;

/**
 * Declarative binding describing an action exposed to the runtime.
 */
export interface InteractionActionBinding<TArgs, TResult> {
	readonly action: DefinedAction<TArgs, TResult>;
	readonly meta?:
		| Record<string, unknown>
		| InteractionActionMetaResolver<TArgs>;
}

/**
 * User-facing value accepted when configuring interaction actions.
 */
export type InteractionActionInput<TArgs, TResult> =
	| InteractionActionBinding<TArgs, TResult>
	| DefinedAction<TArgs, TResult>;

/**
 * Map of action identifiers to bindings registered on the store surface.
 */
export type InteractionActionsRecord = Record<
	string,
	InteractionActionInput<unknown, unknown>
>;

/**
 * Runtime representation of bound interaction actions.
 */
export type InteractionActionsRuntime<
	TActions extends InteractionActionsRecord,
> = {
	[Key in keyof TActions]: TActions[Key] extends InteractionActionInput<
		infer TArgs,
		infer TResult
	>
		? (args: TArgs) => Promise<TResult>
		: never;
};

/**
 * Input shape forwarded to custom hydration callbacks.
 * @public
 */
export interface HydrateServerStateInput<TEntity, TQuery> {
	readonly serverState: InteractivityServerState;
	readonly resource: ResourceObject<TEntity, TQuery>;
	readonly registry?: WPKernelRegistry;
	readonly syncCache: ResourceCacheSync<TEntity>;
}

/**
 * Options accepted by `defineInteraction`.
 */
export interface DefineInteractionOptions<
	TEntity,
	TQuery,
	TStore extends Record<string, unknown>,
	TActions extends InteractionActionsRecord,
> {
	readonly resource: ResourceObject<TEntity, TQuery>;
	readonly feature: string;
	readonly store?: TStore;
	readonly actions?: TActions;
	readonly registry?: WPKernelRegistry;
	readonly namespace?: string;
	readonly autoHydrate?: boolean;
	readonly hydrateServerState?: (
		input: HydrateServerStateInput<TEntity, TQuery>
	) => void;
}

/**
 * Result returned by `defineInteraction`.
 */
export interface DefinedInteraction<TStoreResult> {
	readonly namespace: string;
	readonly store: TStoreResult;
	readonly syncServerState: () => void;
	readonly getServerState: () => InteractivityServerState;
}
