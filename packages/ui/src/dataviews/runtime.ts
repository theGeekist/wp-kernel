import type { Reporter } from '@geekist/wp-kernel/reporter';
import {
	createPreferencesRuntime,
	type DataViewPreferencesRuntime,
	type DataViewPreferencesAdapter,
} from '../runtime/dataviews/preferences';
import {
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_REGISTERED,
	DATA_VIEWS_EVENT_UNREGISTERED,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
	type DataViewsEventEmitter,
	type DataViewActionTriggeredPayload,
	type DataViewChangedPayload,
	type DataViewRegisteredPayload,
} from '../runtime/dataviews/events';
import { DataViewsConfigurationError } from '../runtime/dataviews/errors';
import type {
	KernelDataViewsRuntime,
	NormalizedDataViewsRuntimeOptions,
	DataViewRegistryEntry,
} from '../runtime/dataviews/runtime';
import type {
	DataViewsRuntimeOptions,
	DataViewsStandaloneRuntime,
	DataViewsControllerRuntime,
} from './types';

function childReporter(base: Reporter, namespace: string): Reporter {
	try {
		const child = base.child?.(namespace) as Reporter | undefined;
		return child ?? base;
	} catch (error) {
		base.warn?.('Failed to create reporter child', {
			namespace,
			error,
		});
		return base;
	}
}

function toPreferencesRuntime(
	adapterOrRuntime: DataViewPreferencesRuntime | DataViewPreferencesAdapter
): DataViewPreferencesRuntime {
	if ('adapter' in adapterOrRuntime) {
		return adapterOrRuntime;
	}
	return createPreferencesRuntime(adapterOrRuntime);
}

function createStandaloneEventEmitter(
	reporter: Reporter,
	emit?: (eventName: string, payload: unknown) => void
): DataViewsEventEmitter {
	function safeEmit(eventName: string, payload: unknown) {
		try {
			emit?.(eventName, payload);
			reporter.debug?.('Standalone DataViews event emitted', {
				eventName,
			});
		} catch (error) {
			reporter.error?.('Failed to emit standalone DataViews event', {
				eventName,
				error,
			});
		}
	}

	return {
		registered(payload: DataViewRegisteredPayload) {
			safeEmit(DATA_VIEWS_EVENT_REGISTERED, payload);
		},
		unregistered(payload: DataViewRegisteredPayload) {
			safeEmit(DATA_VIEWS_EVENT_UNREGISTERED, payload);
		},
		viewChanged(payload: DataViewChangedPayload) {
			safeEmit(DATA_VIEWS_EVENT_VIEW_CHANGED, payload);
		},
		actionTriggered(payload: DataViewActionTriggeredPayload) {
			safeEmit(DATA_VIEWS_EVENT_ACTION_TRIGGERED, payload);
		},
	};
}

function createRuntimeSkeleton(
	reporter: Reporter,
	preferences: DataViewPreferencesRuntime,
	options: NormalizedDataViewsRuntimeOptions
): KernelDataViewsRuntime {
	const runtimeReporter = childReporter(reporter, 'ui.dataviews');
	const controllers = new Map<string, unknown>();
	const registry = new Map<string, DataViewRegistryEntry>();

	return {
		registry,
		controllers,
		preferences,
		events: createStandaloneEventEmitter(runtimeReporter),
		reporter: runtimeReporter,
		options,
		getResourceReporter(resource: string) {
			return childReporter(runtimeReporter, resource);
		},
	};
}

function cloneRuntime(
	runtime: KernelDataViewsRuntime,
	events: DataViewsEventEmitter
): KernelDataViewsRuntime {
	return {
		...runtime,
		events,
	};
}

const DEFAULT_OPTIONS: NormalizedDataViewsRuntimeOptions = {
	enable: true,
	autoRegisterResources: false,
};

export function createDataViewsRuntime(
	options: DataViewsRuntimeOptions
): DataViewsStandaloneRuntime {
	if (!options.namespace) {
		throw new DataViewsConfigurationError(
			'DataViews runtime requires a namespace.'
		);
	}

	const baseReporter = options.reporter;
	const preferences = toPreferencesRuntime(options.preferences);
	const baseRuntime = createRuntimeSkeleton(
		baseReporter,
		preferences,
		DEFAULT_OPTIONS
	);
	const events = createStandaloneEventEmitter(
		baseRuntime.reporter,
		options.emit
	);
	const dataviewsRuntime = cloneRuntime(baseRuntime, events);

	const runtimeContext: DataViewsStandaloneRuntime = {
		namespace: options.namespace,
		reporter: baseReporter,
		dataviews: dataviewsRuntime,
		policies: options.policies,
		invalidate: options.invalidate,
	} as DataViewsStandaloneRuntime;

	return runtimeContext;
}

export function isDataViewsRuntime(
	candidate: unknown
): candidate is DataViewsStandaloneRuntime {
	if (!candidate || typeof candidate !== 'object') {
		return false;
	}

	const runtime = candidate as Partial<DataViewsStandaloneRuntime>;
	return Boolean(runtime.dataviews && runtime.namespace);
}

export function ensureControllerRuntime(
	candidate: KernelDataViewsRuntime | DataViewsControllerRuntime
): DataViewsControllerRuntime {
	const runtime = candidate as DataViewsControllerRuntime;
	if (runtime && runtime.preferences && runtime.events) {
		return runtime;
	}
	throw new DataViewsConfigurationError(
		'Invalid DataViews runtime supplied to controller.'
	);
}

export const __TESTING__ = {
	childReporter,
	toPreferencesRuntime,
	createStandaloneEventEmitter,
	createRuntimeSkeleton,
	cloneRuntime,
	DEFAULT_OPTIONS,
};
