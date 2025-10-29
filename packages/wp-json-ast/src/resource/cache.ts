import {
	appendResourceCacheEvent as appendEvent,
	normaliseCacheSegments,
	type ResourceMetadataHost,
	type RestRouteCacheEventPlan,
} from '../common/metadata';
import type {
	ResourceControllerCacheOperation,
	ResourceControllerCacheScope,
} from '../types';

export interface CacheInvalidationDescriptor {
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly unknown[];
	readonly description?: string;
}

export interface CacheInvalidationPlan {
	readonly host: ResourceMetadataHost;
	readonly events: readonly CacheInvalidationDescriptor[];
}

export function buildCacheInvalidators(plan: CacheInvalidationPlan): void {
	for (const event of plan.events) {
		appendEvent({
			host: plan.host,
			scope: event.scope,
			operation: event.operation,
			segments: event.segments,
			description: event.description,
		});
	}
}

export { appendEvent as appendResourceCacheEvent, normaliseCacheSegments };
export type { ResourceMetadataHost, RestRouteCacheEventPlan };
