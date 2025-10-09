/**
 * Showcase kernel configuration
 *
 * The intent is for this file to be the single source of truth that future
 * generators can read to scaffold PHP bridges, REST controllers, and type
 * outputs. Runtime code should import the same data so behaviour stays aligned
 * with generated artifacts.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RouteConfig {
	method: HttpMethod;
	path: string;
	policy?: string;
}

export type CacheKeyToken =
	| string
	| {
			param: string;
	  }
	| {
			literal: unknown;
	  };

export type CacheKeyTemplate = readonly CacheKeyToken[];

export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

export interface QueryParamDescriptor {
	type: 'string' | 'enum';
	optional?: boolean;
	enum?: readonly string[];
	description?: string;
}

export interface ResourceConfig {
	name: string;
	schema: string;
	routes: {
		list: RouteConfig;
		get: RouteConfig;
		create: RouteConfig;
		update: RouteConfig;
		remove: RouteConfig;
	};
	cacheKeys: {
		list: CacheKeyTemplate;
		get: CacheKeyTemplate;
	};
	queryParams?: Record<string, QueryParamDescriptor>;
}

export interface ShowcaseKernelConfig {
	namespace: string;
	schemas: Record<string, SchemaConfig>;
	resources: Record<string, ResourceConfig>;
}

export type JobListParams = {
	q?: string;
	department?: string;
	location?: string;
	status?: 'draft' | 'publish' | 'closed';
	cursor?: string;
};

export const kernelConfig = {
	namespace: 'wp-kernel-showcase',
	schemas: {
		job: {
			path: '../contracts/job.schema.json',
			generated: {
				types: '.generated/types/job.d.ts',
			},
			description:
				'Primary job posting schema used across resources and actions.',
		},
	},
	resources: {
		job: {
			name: 'job',
			schema: 'job',
			routes: {
				list: {
					path: '/wp-kernel-showcase/v1/jobs',
					method: 'GET',
				},
				get: {
					path: '/wp-kernel-showcase/v1/jobs/:id',
					method: 'GET',
				},
				create: {
					path: '/wp-kernel-showcase/v1/jobs',
					method: 'POST',
				},
				update: {
					path: '/wp-kernel-showcase/v1/jobs/:id',
					method: 'PUT',
				},
				remove: {
					path: '/wp-kernel-showcase/v1/jobs/:id',
					method: 'DELETE',
				},
			},
			cacheKeys: {
				list: [
					'job',
					'list',
					{ param: 'q' },
					{ param: 'department' },
					{ param: 'location' },
					{ param: 'status' },
					{ param: 'cursor' },
				],
				get: ['job', 'get', { param: 'id' }],
			},
			queryParams: {
				q: {
					type: 'string',
					optional: true,
					description: 'Freeform search query.',
				},
				department: {
					type: 'string',
					optional: true,
					description: 'Department filter derived from taxonomy.',
				},
				location: {
					type: 'string',
					optional: true,
					description: 'Location filter derived from taxonomy.',
				},
				status: {
					type: 'enum',
					enum: ['draft', 'publish', 'closed'] as const,
					optional: true,
				},
				cursor: {
					type: 'string',
					optional: true,
					description: 'Opaque cursor for pagination.',
				},
			},
		},
	},
} satisfies ShowcaseKernelConfig;

export type ShowcaseKernelConfigType = typeof kernelConfig;

/**
 * Normalize a value to a cache key primitive.
 * @param val - Value to normalize
 * @return Normalized cache key primitive or undefined
 */
function normalizeCacheKeyValue(
	val: unknown
): string | number | boolean | null | undefined {
	if (typeof val === 'string') {
		return val;
	}

	if (typeof val === 'number') {
		return val;
	}

	if (typeof val === 'boolean') {
		return val;
	}

	if (val === null) {
		return null;
	}

	if (val === undefined) {
		return undefined;
	}
	if (typeof val === 'object') {
		return String(val);
	}
	return undefined;
}

/**
 * Process a single cache key segment.
 * @param segment - Cache key token to process
 * @param params  - Optional parameters for param resolution
 * @return Resolved cache key primitive
 */
function processCacheKeySegment<TParams extends Record<string, unknown>>(
	segment: CacheKeyToken,
	params?: Partial<TParams>
): string | number | boolean | null | undefined {
	if (typeof segment === 'string') {
		return segment;
	}

	if ('literal' in segment) {
		return normalizeCacheKeyValue(segment.literal);
	}

	if (!params) {
		return undefined;
	}

	const key = segment.param as keyof TParams;
	const val = (params as Record<keyof TParams, unknown>)[key];
	return normalizeCacheKeyValue(val);
}

/**
 * Convert a cache key template into a runtime function.
 * @param template - Cache key template to convert
 * @return Function that builds cache keys from parameters
 */
export function createCacheKeyBuilder<TParams extends Record<string, unknown>>(
	template: CacheKeyTemplate
) {
	return (
		params?: Partial<TParams>
	): (string | number | boolean | null | undefined)[] => {
		return template.map((segment) =>
			processCacheKeySegment(segment, params)
		);
	};
}
