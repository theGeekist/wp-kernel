import type {
	PhpFileMetadata,
	ResourceControllerCacheEvent,
	ResourceControllerCacheMetadata,
	ResourceControllerCacheOperation,
	ResourceControllerCacheScope,
	ResourceControllerMetadata,
} from '../../types';

export interface ResourceMetadataHost {
	getMetadata: () => PhpFileMetadata;
	setMetadata: (metadata: PhpFileMetadata) => void;
}

function isResourceControllerMetadata(
	metadata: PhpFileMetadata
): metadata is ResourceControllerMetadata {
	return metadata.kind === 'resource-controller';
}

function cloneCacheEvent(
	event: ResourceControllerCacheEvent
): ResourceControllerCacheEvent {
	return {
		...event,
		segments: [...event.segments],
	};
}

function mergeCacheMetadata(
	cache: ResourceControllerCacheMetadata | undefined,
	event: ResourceControllerCacheEvent
): ResourceControllerCacheMetadata {
	if (!cache) {
		return { events: [cloneCacheEvent(event)] };
	}

	return {
		events: [...cache.events, cloneCacheEvent(event)],
	};
}

export function appendResourceControllerCacheEvent(
	host: ResourceMetadataHost,
	event: ResourceControllerCacheEvent
): void {
	const metadata = host.getMetadata();
	if (!isResourceControllerMetadata(metadata)) {
		return;
	}

	const nextCache = mergeCacheMetadata(metadata.cache, event);
	host.setMetadata({
		...metadata,
		cache: nextCache,
	});
}

export interface RestRouteCacheEventPlan {
	readonly host: ResourceMetadataHost;
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly unknown[];
	readonly description?: string;
}

export function appendResourceCacheEvent(plan: RestRouteCacheEventPlan): void {
	appendResourceControllerCacheEvent(plan.host, {
		scope: plan.scope,
		operation: plan.operation,
		segments: normaliseCacheSegments(plan.segments),
		description: plan.description,
	});
}

export function normaliseCacheSegments(segments: readonly unknown[]): string[] {
	return segments.map((segment) => normaliseCacheSegment(segment));
}

function normaliseCacheSegment(segment: unknown): string {
	if (segment === null) {
		return 'null';
	}

	if (segment === undefined) {
		return 'undefined';
	}

	if (typeof segment === 'string') {
		return segment;
	}

	if (typeof segment === 'number' || typeof segment === 'boolean') {
		return String(segment);
	}

	if (typeof segment === 'bigint') {
		return segment.toString();
	}

	if (typeof segment === 'symbol') {
		return segment.description ?? segment.toString();
	}

	try {
		return JSON.stringify(sanitiseJson(segment));
	} catch (_error) {
		return String(segment);
	}
}

function sanitiseJson<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitiseJson(entry)) as unknown as T;
	}

	if (isPlainObject(value)) {
		const entries = Object.entries(value)
			.map(([key, val]) => [key, sanitiseJson(val)] as const)
			.sort(([left], [right]) => left.localeCompare(right));

		return Object.fromEntries(entries) as unknown as T;
	}

	return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
