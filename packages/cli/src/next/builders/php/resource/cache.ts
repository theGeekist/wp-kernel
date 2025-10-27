import {
	appendResourceControllerCacheEvent,
	type ResourceMetadataHost,
	type ResourceControllerCacheOperation,
	type ResourceControllerCacheScope,
} from '@wpkernel/wp-json-ast';
import { sanitizeJson } from '../utils';

export interface CacheEventOptions {
	readonly host: ResourceMetadataHost;
	readonly scope: ResourceControllerCacheScope;
	readonly operation: ResourceControllerCacheOperation;
	readonly segments: readonly unknown[];
	readonly description?: string;
}

export function normaliseCacheSegments(segments: readonly unknown[]): string[] {
	return segments.map((segment) => normaliseCacheSegment(segment));
}

export function appendResourceCacheEvent(options: CacheEventOptions): void {
	appendResourceControllerCacheEvent(options.host, {
		scope: options.scope,
		operation: options.operation,
		segments: normaliseCacheSegments(options.segments),
		description: options.description,
	});
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

	try {
		return JSON.stringify(sanitizeJson(segment));
	} catch (_error) {
		return String(segment);
	}
}
