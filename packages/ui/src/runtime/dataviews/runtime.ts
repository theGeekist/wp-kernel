import type {
	KernelInstance,
	KernelUIRuntime,
	UIIntegrationOptions,
} from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import {
	createDataViewsEventEmitter,
	type DataViewsEventEmitter,
} from './events';
import {
	createDefaultDataViewPreferencesAdapter,
	createPreferencesRuntime,
	type DataViewPreferencesAdapter,
	type DataViewPreferencesRuntime,
} from './preferences';
import { DataViewsConfigurationError } from './errors';

export interface DataViewRegistryEntry {
	resource: string;
	preferencesKey: string;
	metadata?: Record<string, unknown>;
}

export interface DataViewsRuntimeOptions {
	enable?: boolean;
	preferences?: DataViewPreferencesAdapter;
	autoRegisterResources?: boolean;
}

export interface NormalizedDataViewsRuntimeOptions {
	enable: boolean;
	preferences?: DataViewPreferencesAdapter;
	autoRegisterResources: boolean;
}

export interface KernelDataViewsRuntime {
	registry: Map<string, DataViewRegistryEntry>;
	controllers: Map<string, unknown>;
	preferences: DataViewPreferencesRuntime;
	events: DataViewsEventEmitter;
	reporter: Reporter;
	options: NormalizedDataViewsRuntimeOptions;
	getResourceReporter: (resource: string) => Reporter;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPreferencesAdapter(
	candidate: unknown
): candidate is DataViewPreferencesAdapter {
	if (!candidate || typeof candidate !== 'object') {
		return false;
	}

	const maybe = candidate as Partial<DataViewPreferencesAdapter>;
	return typeof maybe.get === 'function' && typeof maybe.set === 'function';
}

function childReporter(base: Reporter, namespace: string): Reporter {
	try {
		const next = base.child?.(namespace) as Reporter | undefined;
		return next ?? base;
	} catch (error) {
		base.warn?.('Failed to create reporter child', {
			namespace,
			error,
		});
		return base;
	}
}

export function normalizeDataViewsOptions(
	options?: UIIntegrationOptions['dataviews']
): NormalizedDataViewsRuntimeOptions {
	if (!isPlainObject(options)) {
		return {
			enable: true,
			autoRegisterResources: true,
		};
	}

	const normalized: NormalizedDataViewsRuntimeOptions = {
		enable: options.enable !== false,
		autoRegisterResources: options.autoRegisterResources !== false,
	};

	if (typeof options.preferences !== 'undefined') {
		if (!isPreferencesAdapter(options.preferences)) {
			throw new DataViewsConfigurationError(
				'DataViews preferences adapter must implement get() and set() methods.',
				{}
			);
		}
		normalized.preferences = options.preferences;
	}

	return normalized;
}

export const __TESTING__ = {
	isPlainObject,
	isPreferencesAdapter,
	childReporter,
};

export function createKernelDataViewsRuntime(
	kernel: KernelInstance,
	runtime: KernelUIRuntime,
	options: NormalizedDataViewsRuntimeOptions
): KernelDataViewsRuntime {
	const reporter = childReporter(runtime.reporter, 'ui.dataviews');
	const adapter =
		options.preferences ??
		createDefaultDataViewPreferencesAdapter(runtime, reporter);
	const preferences = createPreferencesRuntime(adapter);
	const events = createDataViewsEventEmitter(
		kernel,
		childReporter(reporter, 'events')
	);

	return {
		registry: new Map<string, DataViewRegistryEntry>(),
		controllers: new Map(),
		preferences,
		events,
		reporter,
		options,
		getResourceReporter(resource: string) {
			return childReporter(reporter, resource);
		},
	};
}

declare module '@geekist/wp-kernel/data' {
	interface KernelUIRuntime {
		dataviews?: KernelDataViewsRuntime;
	}
}
