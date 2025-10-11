import type {
	CacheKeys,
	ResourceConfig,
	ResourceIdentityConfig,
	ResourceRoutes,
	ResourceStorageConfig,
	ResourceQueryParams,
	ResourceQueryParamDescriptor,
	ResourceDataViewsUIConfig,
} from '@geekist/wp-kernel/resource';
import type { ResourceDataViewConfig } from '@geekist/wp-kernel-ui/dataviews';
import type { Job } from './.generated/types/job';

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
	per_page?: number;
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

const jobStatusLabels: Record<'draft' | 'publish' | 'closed', string> = {
	draft: 'Draft',
	publish: 'Published',
	closed: 'Closed',
};

const toTrimmedString = (value: unknown): string | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
};

const resolveStatus = (value: unknown): JobListParams['status'] | undefined => {
	const candidate = Array.isArray(value) ? value[0] : value;
	const status = toTrimmedString(candidate);
	return status ? (status as JobListParams['status']) : undefined;
};

const assignStringFilter = <K extends keyof JobListParams>(
	target: JobListParams,
	key: K,
	value: unknown
) => {
	const normalized = toTrimmedString(value);
	if (normalized) {
		target[key] = normalized as JobListParams[K];
	}
};

type JobDataViewState = {
	search?: string;
	filters?: Record<string, unknown>;
	page?: number;
	perPage?: number;
};

const jobQueryMapping = (viewState: Record<string, unknown>): JobListParams => {
	const state = viewState as JobDataViewState;
	const params: JobListParams = {
		cursor: String(state.page ?? 1),
		per_page: state.perPage ?? 10,
	};

	const search = toTrimmedString(state.search);
	if (search) {
		params.q = search;
	}

	const filters = state.filters ?? {};
	const status = resolveStatus(filters.status);
	if (status) {
		params.status = status;
	}

	assignStringFilter(params, 'department', filters.department);
	assignStringFilter(params, 'location', filters.location);

	return params;
};

const jobDataViewFields: ResourceDataViewConfig<Job, JobListParams>['fields'] =
	[
		{
			id: 'title',
			label: 'Title',
			enableSorting: true,
		},
		{ id: 'department', label: 'Department' },
		{ id: 'location', label: 'Location' },
		{
			id: 'status',
			label: 'Status',
			elements: (
				Object.entries(jobStatusLabels) as Array<
					[keyof typeof jobStatusLabels, string]
				>
			).map(([value, label]) => ({ value, label })),
			filterBy: { operators: ['isAny'] },
			getValue: ({ item }) =>
				jobStatusLabels[
					(item.status as keyof typeof jobStatusLabels) ?? 'draft'
				] ??
				item.status ??
				'',
		},
		{
			id: 'updated_at',
			label: 'Updated',
			enableSorting: true,
			getValue: ({ item }) => {
				const timestamp = item.updated_at ?? item.created_at;
				if (!timestamp) {
					return '';
				}

				const parsed = new Date(timestamp);
				return Number.isNaN(parsed.getTime())
					? timestamp
					: parsed.toLocaleDateString();
			},
		},
	];

export const jobDataViewsConfig: ResourceDataViewConfig<Job, JobListParams> &
	ResourceDataViewsUIConfig<Job, JobListParams> = {
	fields: jobDataViewFields,
	defaultView: {
		type: 'table',
		fields: ['title', 'department', 'location', 'status', 'updated_at'],
		perPage: 10,
		page: 1,
		sort: { field: 'updated_at', direction: 'desc' },
	},
	mapQuery: jobQueryMapping,
	search: true,
	searchLabel: 'Search jobs',
	perPageSizes: [10, 20, 50],
};

const jobResource: ResourceConfig<Job, JobListParams> = {
	name: 'job',
	identity,
	storage,
	routes,
	cacheKeys,
	queryParams,
	ui: {
		admin: {
			view: 'dataviews',
			dataviews: jobDataViewsConfig,
			screen: {
				component: 'JobsAdminScreen',
				route: '/admin.php?page=wpk-jobs',
				menu: {
					slug: 'wpk-jobs',
					title: 'Jobs',
					capability: 'manage_options',
				},
			},
		},
	},
};

const schemaRegistry: Record<string, SchemaConfig> = {
	job: {
		path: './contracts/job.schema.json',
		generated: {
			types: './.generated/types/job.d.ts',
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
		ResourceConfig<Job, JobListParams> & { schema: string | 'auto' }
	>;
};

export type ShowcaseKernelConfig = typeof kernelConfig;
