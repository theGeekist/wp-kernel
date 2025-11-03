import { defineResource } from '@wpkernel/core/resource';
import { wpkConfig, type Job, type JobListParams } from '../../wpk.config';

const jobResourceConfig = wpkConfig.resources.job;

export const job = defineResource<Job, JobListParams>(jobResourceConfig);
