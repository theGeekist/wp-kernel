import type { ActionEnvelope } from '../actions/middleware';
import type { DefinedAction } from '../actions/types';
import type { WPKernelRegistry } from '../data/types';
import type {
	ResourceActions,
	ResourceObject,
	ResourceState,
} from '../resource/types';

export type DeepReadonly<T> = T extends (...args: infer TArgs) => infer TResult
	? (...args: TArgs) => TResult
	: T extends object
		? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
		: T;

export type InteractivityStoreResult = Record<string, unknown>;

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

export interface InteractivityModule
	extends InteractivityCore,
		Record<string, unknown> {}

export type InteractivityServerState = DeepReadonly<Record<string, unknown>>;

export interface InteractivityGlobal {
	__WPKernelInteractivityStub?: InteractivityModule;
	wp?: {
		interactivity?: InteractivityModule;
	};
}

export type InvokeDispatch = <TArgs, TResult>(
	envelope: ActionEnvelope<TArgs, TResult>
) => Promise<TResult>;

export type ResourceDispatcher<TEntity> =
	| Partial<ResourceActions<TEntity>>
	| undefined;

export type ResourceSnapshotItems<TEntity> = Record<
	string | number,
	TEntity | undefined
>;

export type ResourceCacheSync<TEntity> = (
	snapshot: Partial<ResourceState<TEntity>>
) => void;

export type InteractionActionMetaResolver<TArgs> = (
	args: TArgs
) => Record<string, unknown> | undefined;

export interface InteractionActionBinding<TArgs, TResult> {
	readonly action: DefinedAction<TArgs, TResult>;
	readonly meta?:
		| Record<string, unknown>
		| InteractionActionMetaResolver<TArgs>;
}

export type InteractionActionInput<TArgs, TResult> =
	| InteractionActionBinding<TArgs, TResult>
	| DefinedAction<TArgs, TResult>;

export type InteractionActionsRecord = Record<
	string,
	InteractionActionInput<unknown, unknown>
>;

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

export interface HydrateServerStateInput<TEntity, TQuery> {
	readonly serverState: InteractivityServerState;
	readonly resource: ResourceObject<TEntity, TQuery>;
	readonly registry?: WPKernelRegistry;
	readonly syncCache: ResourceCacheSync<TEntity>;
}

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

export interface DefinedInteraction<TStoreResult> {
	readonly namespace: string;
	readonly store: TStoreResult;
	readonly syncServerState: () => void;
	readonly getServerState: () => InteractivityServerState;
}
