import type { View } from '@wordpress/dataviews';
import { defineInteraction } from '@wpkernel/core/interactivity';
import type {
	DefinedInteraction,
	HydrateServerStateInput,
	InteractionActionsRecord,
	InteractivityStoreResult,
} from '@wpkernel/core/interactivity';
import type { WPKernelRegistry } from '@wpkernel/core/data';
import type { ResourceObject } from '@wpkernel/core/resource';
import type { Reporter } from '@wpkernel/core/reporter';
import { DataViewsControllerError } from '../../runtime/dataviews/errors';
import type { DataViewChangedPayload } from '../../runtime/dataviews/events';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import {
	subscribeToAction,
	subscribeToViewChange,
} from './controllerSubscriptions';

/**
 * Snapshot of the current DataView bridge state exposed to the interactivity store.
 *
 * The state mirrors the controller selection, the normalized view state used to
 * hydrate the client cache, and the derived query payload that consumers can use
 * with resource loaders.
 *
 * @typeParam TQuery - The query payload shape produced by the DataView controller.
 *
 * @category DataViews Integration
 * @public
 */
export type DataViewInteractionState<TQuery> = {
	selection: string[];
	view: DataViewChangedPayload['viewState'];
	query: TQuery;
};

/**
 * Shared interactivity store contract that persists the {@link DataViewInteractionState}.
 *
 * @typeParam TQuery - The query payload shape produced by the DataView controller.
 *
 * @category DataViews Integration
 * @public
 */
export type DataViewInteractionStore<TQuery> = Record<string, unknown> & {
	state: DataViewInteractionState<TQuery>;
};

/**
 * Configuration required to bridge a DataView controller into the interactivity runtime.
 *
 * Provide either an explicit controller instance or the resource metadata so the helper
 * can resolve the registered controller automatically.
 *
 * @typeParam TItem - The resource record type handled by the DataView controller.
 * @typeParam TQuery - The query payload shape produced by the DataView controller.
 * @typeParam TActions - Optional interactivity actions map to augment the interaction.
 *
 * @category DataViews Integration
 * @public
 */
export interface CreateDataViewInteractionOptions<
	TItem,
	TQuery,
	TActions extends
		| InteractionActionsRecord
		| undefined = InteractionActionsRecord,
> {
	/**
	 * Runtime context containing the registered controllers and reporter hooks.
	 */
	runtime: DataViewsRuntimeContext;
	/**
	 * Namespaced identifier used to scope the interaction within the interactivity
	 * runtime. Typically matches the UI feature slug.
	 */
	feature: string;
	/**
	 * Optional controller instance. When omitted, the helper resolves the
	 * controller from the runtime registry using {@link resourceName}.
	 */
	controller?: ResourceDataViewController<TItem, TQuery>;
	/**
	 * Optional resource reference that will be passed through to
	 * {@link defineInteraction}. Provide it when the controller does not embed the
	 * resource definition.
	 */
	resource?: ResourceObject<TItem, TQuery>;
	/**
	 * Resource identifier used to look up the controller from the runtime when
	 * {@link controller} is not provided.
	 */
	resourceName?: string;
	/**
	 * Optional store object that will be extended with the DataView state before
	 * being provided to {@link defineInteraction}.
	 */
	store?: Record<string, unknown>;
	/**
	 * Additional interactivity actions exposed alongside the default resource
	 * actions.
	 */
	actions?: TActions;
	/**
	 * Custom registry implementation to use for dispatch and selectors. Defaults
	 * to the registry registered with the runtime.
	 */
	registry?: WPKernelRegistry;
	/**
	 * Optional namespace override that will be forwarded to
	 * {@link defineInteraction}. Defaults to the runtime namespace.
	 */
	namespace?: string;
	/**
	 * When true, hydrates cached state from the server automatically using the
	 * controller schema.
	 */
	autoHydrate?: boolean;
	/**
	 * Custom server-state hydration handler invoked when {@link autoHydrate} is
	 * enabled.
	 */
	hydrateServerState?: (
		input: HydrateServerStateInput<TItem, TQuery>
	) => void;
}

/**
 * Contract returned by {@link createDataViewInteraction} that exposes the controller,
 * underlying interaction, and convenience helpers to inspect and mutate the bridge state.
 *
 * @typeParam TItem - The resource record type handled by the DataView controller.
 * @typeParam TQuery - The query payload shape produced by the DataView controller.
 *
 * @category DataViews Integration
 * @public
 */
export interface DataViewInteractionResult<TItem, TQuery>
	extends DefinedInteraction<InteractivityStoreResult> {
	/** The resolved DataView controller bound to the interaction. */
	readonly controller: ResourceDataViewController<TItem, TQuery>;
	/**
	 * Updates the mirrored selection state. Useful for synchronising custom UI
	 * elements that mutate the DataView selection outside controller events.
	 */
	readonly setSelection: (selection: Array<string | number>) => void;
	/** Returns the latest computed DataView interaction state. */
	readonly getState: () => DataViewInteractionState<TQuery>;
	/** Restores controller emitters to their original implementations. */
	readonly teardown: () => void;
}

function normalizeSelection(selection: unknown): string[] {
	if (!Array.isArray(selection)) {
		return [];
	}
	return selection
		.map((value) => {
			if (typeof value === 'string') {
				return value;
			}
			if (typeof value === 'number') {
				return String(value);
			}
			return '';
		})
		.filter((value) => value.length > 0);
}

function ensureController<TItem, TQuery>(
	runtime: DataViewsRuntimeContext,
	options: CreateDataViewInteractionOptions<TItem, TQuery>
): ResourceDataViewController<TItem, TQuery> {
	if (options.controller) {
		return options.controller;
	}

	const resourceKey =
		options.resourceName ?? options.resource?.name ?? undefined;

	if (!resourceKey) {
		throw new DataViewsControllerError(
			'DataView interaction requires a resource name to resolve the controller.',
			{
				resource: resourceKey,
			}
		);
	}

	const controller = runtime.dataviews.controllers.get(resourceKey);
	if (!controller) {
		throw new DataViewsControllerError(
			'DataView interaction could not find a controller for the requested resource.',
			{
				resource: resourceKey,
			}
		);
	}

	return controller as ResourceDataViewController<TItem, TQuery>;
}

function resolveResource<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	fallback?: ResourceObject<TItem, TQuery>
): ResourceObject<TItem, TQuery> {
	if (controller.resource) {
		return controller.resource;
	}
	if (fallback) {
		return fallback;
	}
	throw new DataViewsControllerError(
		'DataView interaction requires a resource definition to bind interactivity.',
		{
			resource: controller.resourceName,
		}
	);
}

function createInitialState<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	store?: Record<string, unknown>
): DataViewInteractionState<TQuery> {
	const defaultView = controller.config.defaultView as View;
	const baseState: DataViewInteractionState<TQuery> = {
		selection: [],
		view: controller.deriveViewState(defaultView),
		query: controller.mapViewToQuery(defaultView),
	};

	if (!store) {
		return baseState;
	}

	const existingState = store.state as Partial<
		DataViewInteractionState<TQuery>
	> | null;

	if (existingState) {
		if (existingState.selection) {
			baseState.selection = normalizeSelection(existingState.selection);
		}
		if (existingState.query) {
			baseState.query = existingState.query;
		}
	}

	return baseState;
}

function toRegistry(candidate: unknown): WPKernelRegistry | undefined {
	if (!candidate || typeof candidate !== 'object') {
		return undefined;
	}

	const maybe = candidate as Partial<WPKernelRegistry>;
	return typeof maybe.dispatch === 'function'
		? (candidate as WPKernelRegistry)
		: undefined;
}

function updateStateFromView<TItem, TQuery>(
	controller: ResourceDataViewController<TItem, TQuery>,
	store: DataViewInteractionStore<TQuery>,
	reporter: Reporter,
	view: View
): void {
	const state = store.state as DataViewInteractionState<TQuery>;
	try {
		state.view = controller.deriveViewState(view);
	} catch (error) {
		reporter.error?.(
			'Failed to derive DataViews state for interactivity bridge',
			{
				resource: controller.resourceName,
				error,
			}
		);
		return;
	}

	try {
		state.query = controller.mapViewToQuery(view);
	} catch (error) {
		reporter.error?.('Failed to map DataViews state to resource query', {
			resource: controller.resourceName,
			error,
		});
	}
}

function isStateEqual(a: unknown, b: unknown): boolean {
	if (a === b) {
		return true;
	}

	if (!a || !b) {
		return false;
	}

	if (typeof a !== 'object' || typeof b !== 'object') {
		return false;
	}

	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}

function prepareStoreState<TQuery>(
	store: DataViewInteractionStore<TQuery>,
	initial: DataViewInteractionState<TQuery>
): {
	state: DataViewInteractionState<TQuery>;
	hydrated: boolean;
} {
	const existingState = store.state as
		| DataViewInteractionState<TQuery>
		| undefined;

	if (existingState) {
		const normalizedSelection = normalizeSelection(existingState.selection);
		existingState.selection = normalizedSelection;

		if (existingState.view === undefined || existingState.view === null) {
			existingState.view = initial.view;
		}

		if (existingState.query === undefined || existingState.query === null) {
			existingState.query = initial.query;
		}

		const hydrated =
			existingState !== initial ||
			normalizedSelection.length > 0 ||
			!isStateEqual(existingState.view, initial.view) ||
			!isStateEqual(existingState.query, initial.query);

		return {
			state: existingState,
			hydrated,
		};
	}

	store.state = initial;

	return {
		state: store.state as DataViewInteractionState<TQuery>,
		hydrated: false,
	};
}

/**
 * Creates a typed interactivity binding for a DataView controller.
 *
 * @param     options
 * @example
 * ```ts
 * const runtime = createDataViewsRuntime({ namespace: 'acme/jobs' });
 * const interaction = createDataViewInteraction({
 *     runtime,
 *     feature: 'jobs-table',
 *     resourceName: 'jobs',
 * });
 *
 * const { store } = interaction;
 * // store.state.selection => []
 * ```
 *
 * @typeParam TItem - The resource record type handled by the DataView controller.
 * @typeParam TQuery - The query payload shape produced by the DataView controller.
 * @typeParam TActions - Optional interactivity actions map to augment the interaction.
 *
 * @category DataViews Integration
 * @public
 */
export function createDataViewInteraction<
	TItem,
	TQuery,
	TActions extends
		| InteractionActionsRecord
		| undefined = InteractionActionsRecord,
>(
	options: CreateDataViewInteractionOptions<TItem, TQuery, TActions>
): DataViewInteractionResult<TItem, TQuery> {
	const { runtime, feature } = options;
	const controller = ensureController(runtime, options);
	const resource = resolveResource(controller, options.resource);
	const reporter = runtime.reporter;
	const initialState = createInitialState(controller, options.store);
	let destroyed = false;

	const registry = options.registry ?? toRegistry(runtime.registry);

	const storeDefinition: Record<string, unknown> = {
		...(options.store ?? {}),
		state: initialState,
	};

	const interaction = defineInteraction({
		resource,
		feature,
		store: storeDefinition,
		actions: options.actions,
		registry,
		namespace: options.namespace ?? runtime.namespace,
		autoHydrate: options.autoHydrate,
		hydrateServerState: options.hydrateServerState,
	});

	const store = interaction.store as DataViewInteractionStore<TQuery>;
	const { state, hydrated } = prepareStoreState(store, initialState);

	let currentView = controller.config.defaultView as View;
	let viewVersion = 0;

	const applyView = (view: View) => {
		currentView = view;
		viewVersion += 1;
		updateStateFromView(controller, store, reporter, view);
	};

	if (!hydrated) {
		applyView(currentView);
	}

	const requestedViewVersion = viewVersion;

	void controller.loadStoredView().then((stored) => {
		if (!stored || destroyed) {
			return;
		}
		if (viewVersion !== requestedViewVersion) {
			return;
		}
		applyView(stored as View);
	});

	const unsubscribeView = subscribeToViewChange(
		controller,
		reporter,
		(view) => {
			if (destroyed) {
				return;
			}
			applyView(view);
		}
	);

	const unsubscribeAction = subscribeToAction(
		controller,
		reporter,
		(payload) => {
			if (destroyed) {
				return;
			}
			state.selection = normalizeSelection(payload.selection);
		}
	);

	const setSelection = (selection: Array<string | number>) => {
		if (destroyed) {
			return;
		}
		state.selection = normalizeSelection(selection);
	};

	const teardown = () => {
		if (destroyed) {
			return;
		}
		destroyed = true;
		unsubscribeView();
		unsubscribeAction();
	};

	return {
		...interaction,
		controller,
		setSelection,
		getState: () => store.state as DataViewInteractionState<TQuery>,
		teardown,
	};
}
