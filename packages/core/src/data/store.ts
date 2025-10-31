/* eslint-disable jsdoc/check-tag-names -- allow Typedoc @category tags */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Register a WordPress data store using WP Kernel defaults.
 *
 * The helper wraps `@wordpress/data` store registration so packages can rely on
 * consistent middleware ordering and return the created store for further wiring.
 *
 * @param    key    - Store key used for registration
 * @param    config - Store configuration passed to `createReduxStore`
 * @return Registered WordPress data store
 * @category Data
 */
export function registerWPKernelStore<
	Key extends string,
	State,
	Actions extends Record<string, (...args: unknown[]) => unknown>,
	Selectors,
>(
	key: Key,
	config: Parameters<typeof createReduxStore<State, Actions, Selectors>>[1]
) {
	const store = createReduxStore<State, Actions, Selectors>(key, config);
	register(store);
	return store;
}

/* eslint-enable jsdoc/check-tag-names */
