import { __ } from '@wordpress/i18n';
import { job } from '../../resources';
import type { Job } from '../../../wpk.config';
import { wpkConfig } from '../../../wpk.config';
import { ShowcaseActionError } from '../../errors/ShowcaseActionError';

export type CreateJobInput = {
	title: string;
	department?: string;
	location?: string;
	description?: string;
	status: 'draft' | 'publish' | 'closed';
};

/**
 * CreateJob orchestrates job creation through the resource client.
 * @param input
 */
export async function CreateJob(input: CreateJobInput): Promise<Job> {
	if (!input.title.trim()) {
		throw new ShowcaseActionError('ValidationError', {
			message: __('Job title is required.', 'wp-kernel-showcase'),
			context: {
				actionName: 'Jobs.Create',
			},
		});
	}

	let resource: Awaited<typeof job> | undefined;

	try {
		resource = await job;

		const createdJob = await resource.create?.({
			title: input.title.trim(),
			department: input.department?.trim(),
			location: input.location?.trim(),
			description: input.description?.trim(),
			status: input.status,
		});

		if (!createdJob) {
			throw new ShowcaseActionError('DeveloperError', {
				message: __(
					'Resource client is not configured for creation.',
					'wp-kernel-showcase'
				),
				context: {
					actionName: 'Jobs.Create',
					resourceName: resource.storeKey,
				},
			});
		}

		// Ensure any list queries are refreshed for subsequent renders.
		resource.cache.invalidate.list();

		return createdJob;
	} catch (error) {
		throw ShowcaseActionError.fromUnknown(error, {
			code: 'UnknownError',
			context: {
				actionName: 'Jobs.Create',
				resourceName:
					resource?.storeKey ?? wpkConfig.resources.job.name,
			},
		});
	}
}
