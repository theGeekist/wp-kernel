/**
 * WordPress data store integration
 *
 * Creates typed stores from resource definitions
 */

export { createStore } from './createStore.js';
export type {
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
} from './types.js';
