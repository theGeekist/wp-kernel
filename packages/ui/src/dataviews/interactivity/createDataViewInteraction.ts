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

export type DataViewInteractionState<TQuery> = {
	selection: string[];
	view: DataViewChangedPayload['viewState'];
	query: TQuery;
};

export type DataViewInteractionStore<TQuery> = Record<string, unknown> & {
	state: DataViewInteractionState<TQuery>;
};

export interface CreateDataViewInteractionOptions<
	TItem,
	TQuery,
	TActions extends
		| InteractionActionsRecord
		| undefined = InteractionActionsRecord,
> {
	runtime: DataViewsRuntimeContext;
	feature: string;
	controller?: ResourceDataViewController<TItem, TQuery>;
	resource?: ResourceObject<TItem, TQuery>;
	resourceName?: string;
	store?: Record<string, unknown>;
	actions?: TActions;
	registry?: WPKernelRegistry;
	namespace?: string;
	autoHydrate?: boolean;
	hydrateServerState?: (
		input: HydrateServerStateInput<TItem, TQuery>
	) => void;
}

export interface DataViewInteractionResult<TItem, TQuery>
	extends DefinedInteraction<InteractivityStoreResult> {
	readonly controller: ResourceDataViewController<TItem, TQuery>;
	readonly setSelection: (selection: Array<string | number>) => void;
	readonly getState: () => DataViewInteractionState<TQuery>;
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
	state: DataViewInteractionState<TQuery>,
	reporter: Reporter,
	view: View
): void {
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

function assignStoreState<TQuery>(
	store: Record<string, unknown>,
	state: DataViewInteractionState<TQuery>
): void {
	store.state = state;
}

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
	const state = createInitialState(controller, options.store);
	let destroyed = false;

	const registry = options.registry ?? toRegistry(runtime.registry);

	const storeDefinition: Record<string, unknown> = {
		...(options.store ?? {}),
		state,
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

	assignStoreState(interaction.store, state);

	let currentView = controller.config.defaultView as View;
	updateStateFromView(controller, state, reporter, currentView);

	void controller.loadStoredView().then((stored) => {
		if (!stored || destroyed) {
			return;
		}
		currentView = stored as View;
		updateStateFromView(controller, state, reporter, currentView);
	});

	const originalEmitViewChange = controller.emitViewChange;
	controller.emitViewChange = (view: View) => {
		if (!destroyed) {
			currentView = view;
			updateStateFromView(controller, state, reporter, view);
		}
		originalEmitViewChange.call(controller, view);
	};

	const originalEmitAction = controller.emitAction;
	controller.emitAction = (payload) => {
		if (!destroyed) {
			state.selection = normalizeSelection(payload.selection);
		}
		originalEmitAction.call(controller, payload);
	};

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
		controller.emitViewChange = originalEmitViewChange;
		controller.emitAction = originalEmitAction;
	};

	return {
		...interaction,
		controller,
		setSelection,
		getState: () => state,
		teardown,
	};
}
