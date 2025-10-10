import type { View } from '@wordpress/dataviews';
import { defaultPreferencesKey } from '../runtime/dataviews/preferences';
import { DataViewsControllerError } from '../runtime/dataviews/errors';
import type {
	DataViewsControllerRuntime,
	ResourceDataViewController,
	ResourceDataViewControllerOptions,
	QueryMapping,
} from './types';
import type { DataViewChangedPayload } from '../runtime/dataviews/events';

function toRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}
	return value as Record<string, unknown>;
}

function mergeLayouts(
	defaultView: View,
	stored?: View
): Record<string, unknown> | undefined {
	const defaultLayout = toRecord(
		(defaultView as { layout?: unknown }).layout
	);
	const storedLayout = stored
		? toRecord((stored as { layout?: unknown }).layout)
		: undefined;

	if (!defaultLayout && !storedLayout) {
		return undefined;
	}

	return {
		...(defaultLayout ?? {}),
		...(storedLayout ?? {}),
	};
}

function mergeViews(defaultView: View, stored?: View): View {
	if (!stored) {
		return { ...defaultView };
	}

	const layout = mergeLayouts(defaultView, stored);
	const merged = {
		...defaultView,
		...stored,
		filters: stored.filters ?? defaultView.filters,
		fields: stored.fields ?? defaultView.fields,
		sort: stored.sort ?? defaultView.sort,
	} as View;

	if (layout) {
		(merged as { layout?: Record<string, unknown> }).layout = layout;
	}

	return merged;
}

function ensurePositive(value: number | undefined, fallback: number): number {
	if (!value || Number.isNaN(value) || value <= 0) {
		return fallback;
	}
	return value;
}

function deriveViewState(
	view: View,
	fallback: View
): DataViewChangedPayload['viewState'] {
	const base = mergeViews(fallback, view);
	const filters = base.filters?.reduce<Record<string, unknown>>(
		(acc, filter) => {
			acc[filter.field] = filter.value;
			return acc;
		},
		{}
	);

	return {
		fields: base.fields ?? fallback.fields ?? [],
		sort: base.sort,
		search: base.search ?? fallback.search,
		filters,
		page: ensurePositive(base.page, ensurePositive(fallback.page, 1)),
		perPage: ensurePositive(
			base.perPage,
			ensurePositive(fallback.perPage, 20)
		),
	};
}

function ensureQueryMapping<TItem, TQuery>(
	config: ResourceDataViewControllerOptions<TItem, TQuery>,
	explicit?: QueryMapping<TQuery>
): QueryMapping<TQuery> {
	if (explicit) {
		return explicit;
	}
	if (config.config.mapQuery) {
		return config.config.mapQuery as QueryMapping<TQuery>;
	}
	throw new DataViewsControllerError(
		'Resource DataView controller requires a query mapping function.'
	);
}

function resolveRuntime(
	runtime: DataViewsControllerRuntime
): DataViewsControllerRuntime {
	if (!runtime || typeof runtime !== 'object') {
		throw new DataViewsControllerError(
			'Invalid DataViews runtime supplied to controller.'
		);
	}
	return runtime;
}

export function createResourceDataViewController<TItem, TQuery>(
	options: ResourceDataViewControllerOptions<TItem, TQuery>
): ResourceDataViewController<TItem, TQuery> {
	const runtime = resolveRuntime(options.runtime);
	const resourceName = options.resource?.name ?? options.resourceName;

	if (!resourceName) {
		throw new DataViewsControllerError(
			'Resource DataView controller requires a resource name.'
		);
	}

	const resolvedResourceName = resourceName;

	const preferencesKey =
		options.preferencesKey ??
		defaultPreferencesKey(options.namespace, resolvedResourceName);

	const reporter = runtime.getResourceReporter(resolvedResourceName);
	const queryMapping = ensureQueryMapping(options, options.queryMapping);

	async function loadStoredView(): Promise<View | undefined> {
		try {
			const stored = (await runtime.preferences.get(preferencesKey)) as
				| View
				| undefined;
			if (stored && typeof stored === 'object') {
				return mergeViews(options.config.defaultView, stored);
			}
			return undefined;
		} catch (error) {
			reporter.error?.('Failed to load DataViews preferences', {
				error,
				preferencesKey,
			});
			return undefined;
		}
	}

	async function saveView(view: View): Promise<void> {
		try {
			await runtime.preferences.set(preferencesKey, view);
		} catch (error) {
			reporter.error?.('Failed to persist DataViews preferences', {
				error,
				preferencesKey,
			});
		}
	}

	function mapViewToQuery(view: View): TQuery {
		const state = deriveViewState(view, options.config.defaultView);
		return queryMapping(state);
	}

	function emitViewChange(view: View): void {
		const state = deriveViewState(view, options.config.defaultView);
		runtime.events.viewChanged({
			resource: resolvedResourceName,
			viewState: state,
		});
	}

	function emitRegistered(key: string): void {
		runtime.events.registered({
			resource: resolvedResourceName,
			preferencesKey: key,
		});
	}

	function emitUnregistered(key: string): void {
		runtime.events.unregistered({
			resource: resolvedResourceName,
			preferencesKey: key,
		});
	}

	function emitAction(payload: {
		actionId: string;
		selection: Array<string | number>;
		permitted: boolean;
		reason?: string;
		meta?: Record<string, unknown>;
	}): void {
		runtime.events.actionTriggered({
			resource: resolvedResourceName,
			...payload,
		});
	}

	return {
		resource: options.resource,
		resourceName: resolvedResourceName,
		config: options.config,
		queryMapping,
		runtime,
		namespace: options.namespace,
		preferencesKey,
		invalidate: options.invalidate,
		policies: options.policies,
		fetchList: options.fetchList,
		prefetchList: options.prefetchList,
		mapViewToQuery,
		deriveViewState: (view: View) =>
			deriveViewState(view, options.config.defaultView),
		loadStoredView,
		saveView,
		emitViewChange,
		emitRegistered,
		emitUnregistered,
		emitAction,
		getReporter: () => reporter,
	} satisfies ResourceDataViewController<TItem, TQuery>;
}
