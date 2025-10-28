import {
	appendResourceControllerCacheEvent,
	type ResourceMetadataHost,
} from '../factories/cacheMetadata';
import type {
	ResourceControllerCacheOperation,
	ResourceControllerCacheScope,
} from '../types';

export interface RestRouteCacheEventPlan {
	readonly host: ResourceMetadataHost;
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly unknown[];
	readonly description?: string;
}

/**
 * Append a cache event for a REST route to the associated metadata host.
 *
 * The helper normalises cache segments so they remain serialisable and stable,
 * mirroring the CLI behaviour while colocating the metadata plumbing inside
 * `@wpkernel/wp-json-ast`.
 * @param plan
 */
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
		return JSON.stringify(sanitizeJson(segment));
	} catch (_error) {
		return String(segment);
	}
}

function sanitizeJson<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeJson(entry)) as unknown as T;
	}

	if (isPlainObject(value)) {
		const entries = Object.entries(value)
			.map(([key, val]) => [key, sanitizeJson(val)] as const)
			.sort(([left], [right]) => left.localeCompare(right));

		return Object.fromEntries(entries) as unknown as T;
	}

	return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
