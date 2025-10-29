export type {
	RestRouteCacheEventPlan as CacheEventOptions,
	CacheInvalidationPlan,
	CacheInvalidationDescriptor,
} from '@wpkernel/wp-json-ast';
export {
	appendResourceCacheEvent,
	normaliseCacheSegments,
	buildCacheInvalidators,
} from '@wpkernel/wp-json-ast';
