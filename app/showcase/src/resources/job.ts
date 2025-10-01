/**
 * Job Posting Resource
 *
 * Demonstrates WP Kernel's defineResource pattern for domain-specific entities.
 * This is the canonical way to wire REST endpoints to @wordpress/data stores.
 */

import { defineResource } from '@geekist/wp-kernel';
import type { Job } from '../../types/job';

/**
 * Query parameters for job listing endpoint
 */
export interface JobListParams {
	/**
	 * Search query for job title or description
	 */
	q?: string;

	/**
	 * Filter by department
	 */
	department?: string;

	/**
	 * Filter by location
	 */
	location?: string;

	/**
	 * Filter by status
	 */
	status?: 'draft' | 'publish' | 'closed';

	/**
	 * Pagination cursor
	 */
	cursor?: string;
}

/**
 * Job Posting Resource
 *
 * Provides typed REST client + @wordpress/data store for Job entities.
 *
 * @example
 * ```typescript
 * // In a component
 * import { useSelect } from '@wordpress/data';
 * import { job } from '@/resources/job';
 *
 * const jobs = useSelect((select) => select(job.storeKey).getList());
 * ```
 *
 * @example
 * ```typescript
 * // Direct client usage
 * const allJobs = await job.client.list({ status: 'publish' });
 * const singleJob = await job.client.get(123);
 * ```
 */
export const job = defineResource<Job, JobListParams>({
	/**
	 * Resource name - used for store key and cache key prefix
	 */
	name: 'job',

	/**
	 * REST routes configuration
	 */
	routes: {
		/**
		 * GET /wpk/v1/jobs - List all job postings
		 * Supports query params: q, department, location, status, cursor
		 */
		list: {
			path: '/wpk/v1/jobs',
			method: 'GET',
		},

		/**
		 * GET /wpk/v1/jobs/:id - Get single job posting
		 */
		get: {
			path: '/wpk/v1/jobs/:id',
			method: 'GET',
		},

		/**
		 * POST /wpk/v1/jobs - Create job posting (stub - 501)
		 */
		create: {
			path: '/wpk/v1/jobs',
			method: 'POST',
		},

		/**
		 * PUT /wpk/v1/jobs/:id - Update job posting (stub - 501)
		 */
		update: {
			path: '/wpk/v1/jobs/:id',
			method: 'PUT',
		},

		/**
		 * DELETE /wpk/v1/jobs/:id - Delete job posting (stub - 501)
		 */
		remove: {
			path: '/wpk/v1/jobs/:id',
			method: 'DELETE',
		},
	},

	/**
	 * Cache key generators for deterministic cache invalidation
	 */
	cacheKeys: {
		/**
		 * Cache key for list queries
		 * Pattern: ['job', 'list', queryParams...]
		 * @param params
		 */
		list: (params?: unknown) => {
			const query = params as JobListParams | undefined;
			return [
				'job',
				'list',
				query?.q,
				query?.department,
				query?.location,
				query?.status,
				query?.cursor,
			];
		},

		/**
		 * Cache key for single job queries
		 * Pattern: ['job', 'get', id]
		 * @param params
		 */
		get: (params?: string | number) => ['job', 'get', params],
	},
});

/**
 * Re-export Job type for convenience
 */
export type { Job };
