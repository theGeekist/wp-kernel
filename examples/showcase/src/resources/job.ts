import { defineResource } from '@wpkernel/core/resource';
import {
	kernelConfig,
	type Job,
	type JobListParams,
} from '../../kernel.config';

const jobResourceConfig = kernelConfig.resources.job;

export const job = defineResource<Job, JobListParams>(jobResourceConfig);
