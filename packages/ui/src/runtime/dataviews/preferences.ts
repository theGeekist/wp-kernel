import type { KernelRegistry, KernelUIRuntime } from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { DataViewsConfigurationError } from './errors';

export type DataViewPreferenceScope = 'user' | 'role' | 'site';

export interface DataViewPreferencesAdapter {
	get: (key: string) => Promise<unknown | undefined>;
	set: (key: string, value: unknown) => Promise<void>;
	getScopeOrder?: () => DataViewPreferenceScope[];
}

export interface DataViewPreferencesRuntime {
	adapter: DataViewPreferencesAdapter;
	get: (key: string) => Promise<unknown | undefined>;
	set: (key: string, value: unknown) => Promise<void>;
	getScopeOrder: () => DataViewPreferenceScope[];
}

const DEFAULT_SCOPE_ORDER: DataViewPreferenceScope[] = ['user', 'role', 'site'];
const PREFERENCES_STORE = 'core/preferences';
const DATAVIEWS_SCOPE_SEGMENT = 'dataviews';

type RegistryLike = Pick<KernelRegistry, 'select' | 'dispatch'>;

type PreferencesSelectors = {
	get: (scope: string, key: string, defaultValue?: unknown) => unknown;
};

type PreferencesActions = {
	set: (scope: string, key: string, value: unknown) => void;
};

function childReporter(base: Reporter, namespace: string): Reporter {
	try {
		const next = base.child(namespace) as Reporter | undefined;
		return next ?? base;
	} catch (error) {
		base.warn?.('Failed to create reporter child', {
			namespace,
			error,
		});
		return base;
	}
}

function isRegistryLike(candidate: unknown): candidate is RegistryLike {
	if (!candidate || typeof candidate !== 'object') {
		return false;
	}

	const maybe = candidate as Partial<RegistryLike>;
	return (
		typeof maybe.select === 'function' &&
		typeof maybe.dispatch === 'function'
	);
}

function resolveRegistry(
	runtime: KernelUIRuntime,
	reporter: Reporter
): RegistryLike {
	if (isRegistryLike(runtime.registry)) {
		return runtime.registry;
	}

	const wpData = (
		globalThis as {
			wp?: { data?: KernelRegistry };
		}
	).wp?.data;

	if (isRegistryLike(wpData)) {
		reporter.debug('Resolved preferences registry from global wp.data');
		return wpData;
	}

	throw new DataViewsConfigurationError(
		'WordPress data registry is required to persist DataViews preferences.',
		{
			namespace: runtime.namespace,
		}
	);
}

function getSelectors(registry: RegistryLike): PreferencesSelectors {
	const selectors = registry.select(PREFERENCES_STORE) as
		| PreferencesSelectors
		| undefined;

	if (!selectors || typeof selectors.get !== 'function') {
		throw new DataViewsConfigurationError(
			'`core/preferences` store not available in the WordPress registry.',
			{}
		);
	}

	return selectors;
}

function getActions(registry: RegistryLike): PreferencesActions {
	const actions = registry.dispatch(PREFERENCES_STORE) as
		| PreferencesActions
		| undefined;

	if (!actions || typeof actions.set !== 'function') {
		throw new DataViewsConfigurationError(
			'`core/preferences` store does not expose a set() action.',
			{}
		);
	}

	return actions;
}

function buildScopeKey(
	namespace: string,
	scope: DataViewPreferenceScope
): string {
	return `${namespace}/${DATAVIEWS_SCOPE_SEGMENT}/${scope}`;
}

export function defaultPreferencesKey(
	namespace: string,
	resource: string
): string {
	return `${namespace}/${DATAVIEWS_SCOPE_SEGMENT}/${resource}`;
}

export function createPreferencesRuntime(
	adapter: DataViewPreferencesAdapter
): DataViewPreferencesRuntime {
	return {
		adapter,
		get(key) {
			return adapter.get(key);
		},
		set(key, value) {
			return adapter.set(key, value);
		},
		getScopeOrder() {
			return adapter.getScopeOrder?.() ?? [...DEFAULT_SCOPE_ORDER];
		},
	};
}

export function createDefaultDataViewPreferencesAdapter(
	runtime: KernelUIRuntime,
	reporter: Reporter
): DataViewPreferencesAdapter {
	const scopeOrder = [...DEFAULT_SCOPE_ORDER];
	const adapterReporter = childReporter(reporter, 'preferences');

	async function readFromScope(
		selectors: PreferencesSelectors,
		namespace: string,
		scope: DataViewPreferenceScope,
		key: string
	): Promise<unknown | undefined> {
		const scopeKey = buildScopeKey(namespace, scope);
		const value = selectors.get(scopeKey, key);
		if (typeof value !== 'undefined') {
			adapterReporter.debug('Resolved DataViews preference from scope', {
				scope,
				key,
			});
			return value;
		}
		return undefined;
	}

	async function writeToScope(
		actions: PreferencesActions,
		namespace: string,
		scope: DataViewPreferenceScope,
		key: string,
		value: unknown
	): Promise<void> {
		const scopeKey = buildScopeKey(namespace, scope);
		actions.set(scopeKey, key, value);
		adapterReporter.debug('Persisted DataViews preference', {
			scope,
			key,
		});
	}

	return {
		async get(key) {
			const registry = resolveRegistry(runtime, adapterReporter);
			const selectors = getSelectors(registry);
			for (const scope of scopeOrder) {
				const value = await readFromScope(
					selectors,
					runtime.namespace,
					scope,
					key
				);
				if (typeof value !== 'undefined') {
					return value;
				}
			}
			return undefined;
		},
		async set(key, value) {
			const registry = resolveRegistry(runtime, adapterReporter);
			const actions = getActions(registry);
			const primaryScope = scopeOrder[0] ?? 'user';
			await writeToScope(
				actions,
				runtime.namespace,
				primaryScope,
				key,
				value
			);
		},
		getScopeOrder() {
			return [...scopeOrder];
		},
	};
}

export { DEFAULT_SCOPE_ORDER as DATA_VIEW_DEFAULT_SCOPE_ORDER };
