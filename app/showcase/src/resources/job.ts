import { defineResource } from '@geekist/wp-kernel';
import type { Job } from '../../.generated/types/job';
import { kernelConfig, type JobListParams } from '../kernel.config';

const jobResourceConfig = kernelConfig.resources.job;

export const job = defineResource<Job, JobListParams>({
	name: jobResourceConfig.name,
	routes: jobResourceConfig.routes,
	cacheKeys: {
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
		get: (id?: string | number) => ['job', 'get', id],
	},
});
