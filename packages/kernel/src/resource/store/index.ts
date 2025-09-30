/**
 * WordPress data store integration
 *
 * Creates typed stores from resource definitions
 */

export { createStore } from './createStore';
export type {
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
} from './types';
