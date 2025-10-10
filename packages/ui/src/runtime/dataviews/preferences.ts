/**
 * DataViews Preferences System
 *
 * Manages persistent state for DataViews components using WordPress core/preferences
 * store with support for scoped preference hierarchies (user → role → site).
 *
 * @module
 */

import type { KernelRegistry, KernelUIRuntime } from '@geekist/wp-kernel/data';
import type { Reporter } from '@geekist/wp-kernel/reporter';
import { DataViewsConfigurationError } from './errors';

/**
 * Preference scope levels in WordPress
 *
 * Determines where preferences are stored and their precedence:
 * - `user` - Per-user preferences (highest priority)
 * - `role` - Per-role preferences (medium priority)
 * - `site` - Site-wide preferences (lowest priority)
 */
export type DataViewPreferenceScope = 'user' | 'role' | 'site';

/**
 * Adapter for persisting DataViews preferences
 *
 * Abstracts the underlying storage mechanism (typically WordPress core/preferences).
 * Implementations should handle scope-based preference resolution.
 *
 * @example
 * ```typescript
 * const adapter: DataViewPreferencesAdapter = {
 *   async get(key) {
 *     // Resolve from user → role → site scopes
 *     return await resolveFromScopes(key);
 *   },
 *   async set(key, value) {
 *     // Persist to primary scope (typically user)
 *     await persistToUserScope(key, value);
 *   },
 *   getScopeOrder() {
 *     return ['user', 'role', 'site'];
 *   }
 * };
 * ```
 */
export interface DataViewPreferencesAdapter {
	/**
	 * Retrieve a preference value by key
	 *
	 * Should resolve from scopes in order (user → role → site by default).
	 *
	 * @param key - Preference key (e.g., 'job-listings')
	 * @return Preference value or undefined if not found
	 */
	get: (key: string) => Promise<unknown | undefined>;

	/**
	 * Persist a preference value
	 *
	 * Should write to the primary scope (typically 'user').
	 *
	 * @param key   - Preference key
	 * @param value - Preference value to persist
	 */
	set: (key: string, value: unknown) => Promise<void>;

	/**
	 * Get the preference scope resolution order
	 *
	 * @return Array of scopes in priority order (e.g., ['user', 'role', 'site'])
	 */
	getScopeOrder?: () => DataViewPreferenceScope[];
}

/**
 * Runtime for managing DataViews preferences
 *
 * Wraps a preferences adapter with convenience methods for components.
 * Created via createPreferencesRuntime function.
 */
export interface DataViewPreferencesRuntime {
	/**
	 * The underlying preferences adapter
	 */
	adapter: DataViewPreferencesAdapter;

	/**
	 * Retrieve a preference value
	 *
	 * @param key - Preference key
	 * @return Preference value or undefined
	 */
	get: (key: string) => Promise<unknown | undefined>;

	/**
	 * Persist a preference value
	 *
	 * @param key   - Preference key
	 * @param value - Preference value
	 */
	set: (key: string, value: unknown) => Promise<void>;

	/**
	 * Get the preference scope resolution order
	 *
	 * @return Array of scopes in priority order
	 */
	getScopeOrder: () => DataViewPreferenceScope[];
}

/**
 * Default preference scope resolution order
 *
 * User preferences override role preferences, which override site preferences.
 */
const DEFAULT_SCOPE_ORDER: DataViewPreferenceScope[] = ['user', 'role', 'site'];

/**
 * WordPress core/preferences store identifier
 *
 * @internal
 */
const PREFERENCES_STORE = 'core/preferences';

/**
 * DataViews segment in preference keys
 *
 * @internal
 */
const DATAVIEWS_SCOPE_SEGMENT = 'dataviews';

/**
 * Registry-like interface for WordPress data stores
 *
 * @internal
 */
type RegistryLike = Pick<KernelRegistry, 'select' | 'dispatch'>;

/**
 * core/preferences selectors interface
 *
 * @internal
 */
type PreferencesSelectors = {
	get: (scope: string, key: string, defaultValue?: unknown) => unknown;
};

/**
 * core/preferences actions interface
 *
 * @internal
 */
type PreferencesActions = {
	set: (scope: string, key: string, value: unknown) => void;
};

/**
 * Create a child reporter for preferences operations
 *
 * @internal
 * @param base      - Base reporter instance
 * @param namespace - Child namespace
 * @return Child reporter or base reporter if child creation fails
 */
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

/**
 * Type guard: check if candidate implements RegistryLike interface
 *
 * @internal
 * @param candidate - Value to check
 * @return True if candidate has select() and dispatch() methods
 */
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

/**
 * Resolve WordPress data registry from runtime or global
 *
 * Attempts to resolve the registry from:
 * 1. `runtime.registry` if it implements RegistryLike
 * 2. `globalThis.wp.data` as fallback
 *
 * @internal
 * @param runtime  - Kernel UI runtime
 * @param reporter - Reporter for debugging
 * @return WordPress data registry
 * @throws DataViewsConfigurationError If no valid registry is found
 */
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

/**
 * Get core/preferences store selectors from registry
 *
 * @internal
 * @param registry - WordPress data registry
 * @return Preferences store selectors
 * @throws DataViewsConfigurationError If core/preferences store is not available
 */
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

/**
 * Get core/preferences store actions from registry
 *
 * @internal
 * @param registry - WordPress data registry
 * @return Preferences store actions
 * @throws DataViewsConfigurationError If core/preferences store does not expose set() action
 */
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

/**
 * Build scoped preference key for WordPress core/preferences store
 *
 * @internal
 * @param namespace - Application namespace
 * @param scope     - Preference scope (user, role, or site)
 * @return Scoped preference key (e.g., 'my-plugin/dataviews/user')
 */
function buildScopeKey(
	namespace: string,
	scope: DataViewPreferenceScope
): string {
	return `${namespace}/${DATAVIEWS_SCOPE_SEGMENT}/${scope}`;
}

/**
 * Generate default preference key for a resource
 *
 * Creates a namespaced key for storing DataViews preferences per resource.
 *
 * @param namespace - Application namespace
 * @param resource  - Resource name
 * @return Preference key (e.g., 'my-plugin/dataviews/jobs')
 * @example
 * ```typescript
 * const key = defaultPreferencesKey('hr-manager', 'job-listings');
 * // Returns: 'hr-manager/dataviews/job-listings'
 * ```
 */
export function defaultPreferencesKey(
	namespace: string,
	resource: string
): string {
	return `${namespace}/${DATAVIEWS_SCOPE_SEGMENT}/${resource}`;
}

/**
 * Create a preferences runtime from an adapter
 *
 * Wraps a preferences adapter with convenience methods and scope resolution.
 * This is a thin wrapper that delegates to the underlying adapter.
 *
 * @param adapter - Preferences adapter implementation
 * @return Preferences runtime with get/set/getScopeOrder methods
 * @example
 * ```typescript
 * const adapter = createDefaultDataViewPreferencesAdapter(runtime, reporter);
 * const preferences = createPreferencesRuntime(adapter);
 *
 * // Use in components
 * const viewConfig = await preferences.get('job-listings');
 * await preferences.set('job-listings', { layout: 'grid' });
 * ```
 */
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

/**
 * Create default DataViews preferences adapter
 *
 * Creates an adapter that persists preferences using WordPress core/preferences store
 * with support for scoped preference hierarchies (user → role → site).
 *
 * The adapter:
 * - Reads preferences from scopes in order until a value is found
 * - Writes preferences to the primary scope (default: 'user')
 * - Integrates with WordPress data registry for persistence
 * - Reports operations via the provided reporter
 *
 * @param runtime  - Kernel UI runtime containing registry and namespace
 * @param reporter - Reporter for debugging and telemetry
 * @return Preferences adapter configured for the runtime
 * @throws DataViewsConfigurationError If WordPress registry or core/preferences store is unavailable
 * @example
 * ```typescript
 * import { createDefaultDataViewPreferencesAdapter } from '@geekist/wp-kernel-ui';
 *
 * const adapter = createDefaultDataViewPreferencesAdapter(
 *   { namespace: 'my-plugin', registry: wp.data },
 *   reporter
 * );
 *
 * // Adapter resolves preferences from user → role → site scopes
 * const config = await adapter.get('job-listings'); // Checks all scopes
 * await adapter.set('job-listings', { layout: 'grid' }); // Writes to user scope
 * ```
 */
export function createDefaultDataViewPreferencesAdapter(
	runtime: KernelUIRuntime,
	reporter: Reporter
): DataViewPreferencesAdapter {
	const scopeOrder = [...DEFAULT_SCOPE_ORDER];
	const adapterReporter = childReporter(reporter, 'preferences');

	/**
	 * Read preference value from a specific scope
	 *
	 * @internal
	 * @param selectors - Preferences store selectors
	 * @param namespace - Application namespace
	 * @param scope     - Preference scope to read from
	 * @param key       - Preference key
	 * @return Preference value or undefined
	 */
	function readFromScope(
		selectors: PreferencesSelectors,
		namespace: string,
		scope: DataViewPreferenceScope,
		key: string
	): unknown | undefined {
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

	/**
	 * Write preference value to a specific scope
	 *
	 * @internal
	 * @param actions   - Preferences store actions
	 * @param namespace - Application namespace
	 * @param scope     - Preference scope to write to
	 * @param key       - Preference key
	 * @param value     - Preference value to persist
	 */
	function writeToScope(
		actions: PreferencesActions,
		namespace: string,
		scope: DataViewPreferenceScope,
		key: string,
		value: unknown
	): void {
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
				const value = readFromScope(
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
			return writeToScope(
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

/**
 * Default preference scope resolution order
 *
 * @deprecated Use DATA_VIEW_DEFAULT_SCOPE_ORDER for consistency
 */
export { DEFAULT_SCOPE_ORDER as DATA_VIEW_DEFAULT_SCOPE_ORDER };
