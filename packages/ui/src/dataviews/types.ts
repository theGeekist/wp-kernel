import type { ReactNode } from 'react';
import type { Action, Field, View } from '@wordpress/dataviews';
import type { DefinedAction } from '@wpkernel/core/actions';
import type {
	CacheKeyPattern,
	InvalidateOptions,
	ResourceObject,
	ListResponse,
} from '@wpkernel/core/resource';
import type { WPKUICapabilityRuntime } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	DataViewChangedPayload,
	DataViewsEventEmitter,
} from '../runtime/dataviews/events';
import type {
	DataViewPreferencesRuntime,
	DataViewPreferencesAdapter,
} from '../runtime/dataviews/preferences';
import type {
	KernelDataViewsRuntime,
	NormalizedDataViewsRuntimeOptions,
} from '../runtime/dataviews/runtime';

/**
 * Mapping function transforming DataViews state into resource queries.
 */
export type QueryMapping<TQuery> = (
	state: DataViewChangedPayload['viewState']
) => TQuery;

/**
 * Context passed to DataViews controllers for logging and event emission.
 */
export interface DataViewsControllerRuntime {
	readonly registry: Map<string, unknown>;
	readonly controllers: Map<string, unknown>;
	readonly preferences: DataViewPreferencesRuntime;
	readonly events: DataViewsEventEmitter;
	readonly reporter: Reporter;
	readonly options: NormalizedDataViewsRuntimeOptions;
	readonly getResourceReporter: (resource: string) => Reporter;
}

/**
 * Runtime shape exposed to UI consumers (kernel or standalone).
 */
export interface DataViewsRuntimeContext {
	readonly namespace: string;
	readonly dataviews: DataViewsControllerRuntime;
	readonly capabilities?: WPKUICapabilityRuntime;
	readonly invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	readonly registry?: unknown;
	readonly reporter: Reporter;
	readonly kernel?: unknown;
}

/**
 * Action configuration for ResourceDataView.
 */
export interface ResourceDataViewActionConfig<
	TItem,
	TInput,
	TResult = unknown,
> {
	/** Unique identifier, mirrored in events. */
	id: string;
	/** Action implementation to invoke. */
	action: DefinedAction<TInput, TResult>;
	/** Label shown in DataViews UI. */
	label: Action<TItem>['label'];
	/** Whether bulk selection is supported. */
	supportsBulk?: boolean;
	/** Flag destructive styling. */
	isDestructive?: boolean;
	/** Flag primary styling. */
	isPrimary?: boolean;
	/** Capability key to gate rendering and execution. */
	capability?: string;
	/** When true, render disabled instead of hiding on capability denial. */
	disabledWhenDenied?: boolean;
	/**
	 * Build action input payload from the current selection and items.
	 */
	getActionArgs: (context: {
		selection: Array<string | number>;
		items: TItem[];
	}) => TInput;
	/**
	 * Optional meta object included in action triggered events.
	 */
	buildMeta?: (context: {
		selection: Array<string | number>;
		items: TItem[];
	}) => Record<string, unknown> | undefined;
	/**
	 * Optional invalidate hook overriding the default behaviour.
	 */
	invalidateOnSuccess?: (
		result: TResult,
		context: {
			selection: Array<string | number>;
			items: TItem[];
			input: TInput;
		}
	) => CacheKeyPattern[] | false;
}

/**
 * Resource DataView configuration.
 */
export interface ResourceDataViewConfig<TItem, TQuery> {
	fields: Field<TItem>[];
	defaultView: View;
	mapQuery: QueryMapping<TQuery>;
	actions?: Array<ResourceDataViewActionConfig<TItem, unknown, unknown>>;
	search?: boolean;
	searchLabel?: string;
	getItemId?: (item: TItem) => string;
	empty?: ReactNode;
	perPageSizes?: number[];
	defaultLayouts?: Record<string, unknown>;
}

export type WPKUICapabilityRuntimeSource =
	| WPKUICapabilityRuntime
	| (() => WPKUICapabilityRuntime | undefined);

export interface ResourceDataViewControllerOptions<TItem, TQuery> {
	resource?: ResourceObject<TItem, TQuery>;
	resourceName?: string;
	config: ResourceDataViewConfig<TItem, TQuery>;
	queryMapping?: QueryMapping<TQuery>;
	runtime: DataViewsControllerRuntime;
	namespace: string;
	invalidate?: (patterns: CacheKeyPattern | CacheKeyPattern[]) => void;
	capabilities?: WPKUICapabilityRuntimeSource;
	preferencesKey?: string;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	prefetchList?: (query: TQuery) => Promise<void>;
}

export interface ResourceDataViewController<TItem, TQuery> {
	readonly resource?: ResourceObject<TItem, TQuery>;
	readonly resourceName: string;
	readonly config: ResourceDataViewConfig<TItem, TQuery>;
	readonly queryMapping: QueryMapping<TQuery>;
	readonly runtime: DataViewsControllerRuntime;
	readonly namespace: string;
	readonly preferencesKey: string;
	readonly invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[]
	) => void;
	readonly capabilities?: WPKUICapabilityRuntime;
	readonly fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	readonly prefetchList?: (query: TQuery) => Promise<void>;
	mapViewToQuery: (view: View) => TQuery;
	deriveViewState: (view: View) => DataViewChangedPayload['viewState'];
	loadStoredView: () => Promise<View | undefined>;
	saveView: (view: View) => Promise<void>;
	emitViewChange: (view: View) => void;
	emitRegistered: (preferencesKey: string) => void;
	emitUnregistered: (preferencesKey: string) => void;
	emitAction: (payload: {
		actionId: string;
		selection: Array<string | number>;
		permitted: boolean;
		reason?: string;
		meta?: Record<string, unknown>;
	}) => void;
	getReporter: () => Reporter;
}

export interface DataViewsRuntimeOptions {
	namespace: string;
	reporter: Reporter;
	preferences: DataViewPreferencesRuntime | DataViewPreferencesAdapter;
	capabilities?: WPKUICapabilityRuntime;
	invalidate?: (patterns: CacheKeyPattern | CacheKeyPattern[]) => void;
	emit?: (eventName: string, payload: unknown) => void;
}

export interface DataViewsStandaloneRuntime extends DataViewsRuntimeContext {
	readonly dataviews: KernelDataViewsRuntime;
	readonly capabilities?: WPKUICapabilityRuntime;
}
