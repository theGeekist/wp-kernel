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
			await jobResource.remove(id);
		}
	});

	test('seeds and removes a single job', async ({ kernel, requestUtils }) => {
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		const created = await jobResource.seed({
			title: 'Resource Helper Engineer',
			status: 'publish',
			department: 'QA',
		});
		createdJobIds.push(created.id);

		expect(created.id).toBeGreaterThan(0);
		expect(created.title).toBe('Resource Helper Engineer');

		await jobResource.remove(created.id);
		createdJobIds.pop();

		const response = await requestUtils.rest({
			path: '/wp-kernel-showcase/v1/jobs',
			method: 'GET',
		});

		if (!Array.isArray(response)) {
			throw new Error('Expected job list response to be an array');
		}

		const ids = response.map((item: { id?: number }) => item.id);
		expect(ids).not.toContain(created.id);
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
