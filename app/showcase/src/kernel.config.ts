import type {
	CacheKeys,
	ResourceConfig,
	ResourceIdentityConfig,
	ResourceRoutes,
	ResourceStorageConfig,
	ResourceQueryParams,
	ResourceQueryParamDescriptor,
} from '@geekist/wp-kernel/resource';

/**
 * Showcase kernel configuration
 *
 * This file mirrors the kernel contract directly—no local type copies.
 */

export type JobListParams = {
	q?: string;
	department?: string;
	location?: string;
	status?: 'draft' | 'publish' | 'closed';
	cursor?: string;
};

export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

const identity: ResourceIdentityConfig = {
	type: 'number',
	param: 'id',
};

const storage: ResourceStorageConfig = {
	mode: 'wp-post',
	postType: 'wpk_job',
	statuses: ['closed'],
	supports: ['title', 'editor', 'custom-fields'],
	meta: {
		department: { type: 'string', single: true },
		location: { type: 'string', single: true },
		seniority: { type: 'string', single: true },
		job_type: { type: 'string', single: true },
		remote_policy: { type: 'string', single: true },
		salary_min: { type: 'integer', single: true },
		salary_max: { type: 'integer', single: true },
		apply_deadline: { type: 'string', single: true },
	},
	taxonomies: {
		department: { taxonomy: 'wpk_job_department', hierarchical: false },
		location: { taxonomy: 'wpk_job_location', hierarchical: false },
	},
};

const routes: ResourceRoutes = {
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
		policy: 'jobs.create',
	},
	update: {
		path: '/wp-kernel-showcase/v1/jobs/:id',
		method: 'PUT',
		policy: 'jobs.update',
	},
	remove: {
		path: '/wp-kernel-showcase/v1/jobs/:id',
		method: 'DELETE',
		policy: 'jobs.delete',
	},
};

const normalizeKeyValue = (
	value: string | number | boolean | null | undefined
) => (value === undefined ? null : value);

const cacheKeys: Required<CacheKeys<JobListParams>> = {
	list: (params?: JobListParams) => {
		const source = params ?? {};
		return [
			'job',
			'list',
			normalizeKeyValue(source.q ?? null),
			normalizeKeyValue(source.department ?? null),
			normalizeKeyValue(source.location ?? null),
			normalizeKeyValue(source.status ?? null),
			normalizeKeyValue(source.cursor ?? null),
		];
	},
	get: (id?: string | number) => ['job', 'get', id ?? null],
	create: () => ['job', 'create'],
	update: (id?: string | number) => ['job', 'update', id ?? null],
	remove: (id?: string | number) => ['job', 'remove', id ?? null],
};

const queryParams: ResourceQueryParams = {
	q: {
		type: 'string',
		optional: true,
		description: 'Freeform search query.',
	} satisfies ResourceQueryParamDescriptor,
	department: {
		type: 'string',
		optional: true,
		description: 'Department filter derived from taxonomy.',
	} satisfies ResourceQueryParamDescriptor,
	location: {
		type: 'string',
		optional: true,
		description: 'Location filter derived from taxonomy.',
	} satisfies ResourceQueryParamDescriptor,
	status: {
		type: 'enum',
		enum: ['draft', 'publish', 'closed'] as const,
		optional: true,
	} satisfies ResourceQueryParamDescriptor,
	cursor: {
		type: 'string',
		optional: true,
		description: 'Opaque cursor for pagination.',
	} satisfies ResourceQueryParamDescriptor,
};

const jobResource: ResourceConfig<unknown, JobListParams> = {
	name: 'job',
	identity,
	storage,
	routes,
	cacheKeys,
	queryParams,
} as ResourceConfig<unknown, JobListParams>;

const schemaRegistry: Record<string, SchemaConfig> = {
	job: {
		path: '../contracts/job.schema.json',
		generated: {
			types: '../.generated/types/job.d.ts',
		},
		description: 'Primary job resource schema used for generation.',
	},
};

export const kernelConfig = {
	version: 1,
	namespace: 'wp-kernel-showcase',
	schemas: schemaRegistry,
	resources: {
		job: {
			...jobResource,
			schema: 'job',
		},
	},
} satisfies {
	version: 1;
	namespace: string;
	schemas: Record<string, SchemaConfig>;
	resources: Record<
		string,
		ResourceConfig<unknown, JobListParams> & { schema: string | 'auto' }
	>;
};

export type ShowcaseKernelConfig = typeof kernelConfig;
