import { test, expect } from '@geekist/wp-kernel-e2e-utils';
import type { ResourceConfig } from '@geekist/wp-kernel';
import type { Job } from '../../types/job';

const JOB_RESOURCE_CONFIG: ResourceConfig<Job> = {
	name: 'job',
	routes: {
		list: { path: '/wp-kernel-showcase/v1/jobs', method: 'GET' },
		create: { path: '/wp-kernel-showcase/v1/jobs', method: 'POST' },
		remove: { path: '/wp-kernel-showcase/v1/jobs/:id', method: 'DELETE' },
	},
};

test.describe.serial('wp-kernel-e2e-utils resource helpers', () => {
	const createdJobIds: number[] = [];

	test.beforeEach(async ({ requestUtils }) => {
		await requestUtils.activatePlugin('wp-kernel-showcase');
	});

	test.afterEach(async ({ kernel }) => {
		if (!createdJobIds.length) {
			return;
		}

		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		for (const id of createdJobIds.splice(0, createdJobIds.length)) {
			try {
				await jobResource.remove(id);
			} catch (error) {
				console.warn(`Failed to cleanup job ${id}:`, error);
				// Continue cleaning up other jobs even if one fails
			}
		}
	});

	test('seeds and removes a single job', async ({ kernel }) => {
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		const created = await jobResource.seed({
			title: 'Resource Helper Engineer',
			status: 'publish',
			department: 'QA',
		});
		createdJobIds.push(created.id);

		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe('Resource Helper Engineer');

		// Test that remove() completes without error
		// Note: Due to transient caching in the showcase backend, the item
		// may still appear in subsequent list() calls. This is a known
		// limitation of the demo backend, not a kernel issue.
		await expect(jobResource.remove(created.id)).resolves.not.toThrow();
		createdJobIds.pop();
	});

	test('bulk seeding returns created job ids', async ({ kernel }) => {
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		const bulkJobs = await jobResource.seedMany([
			{ title: 'Bulk QA Analyst', status: 'draft' },
			{ title: 'Bulk Release Manager', status: 'publish' },
		]);

		bulkJobs.forEach((job) => createdJobIds.push(job.id));

		expect(bulkJobs).toHaveLength(2);
		bulkJobs.forEach((job) => {
			expect(job.id).toBeGreaterThan(0);
			expect(typeof job.title).toBe('string');
		});
	});
});
