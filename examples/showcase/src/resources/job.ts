import { defineResource } from '@wpkernel/core/resource';
import type { Job } from '../../.generated/types/job';
import { kernelConfig, type JobListParams } from '../../kernel.config';

const jobResourceConfig = kernelConfig.resources.job;

export const job = defineResource<Job, JobListParams>({
	name: jobResourceConfig.name,
	routes: jobResourceConfig.routes,
	cacheKeys: jobResourceConfig.cacheKeys,
});
