import { test, expect } from '@geekist/wp-kernel-e2e-utils';
import type { Page } from '@playwright/test';
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

async function login(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', 'admin');
	await page.fill('#user_pass', 'password');
	await page.click('#wp-submit');
	await page.waitForURL(/\/wp-admin/);
}

async function openJobsPage(page: Page) {
	await login(page);
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	await page.waitForSelector('[data-testid="jobs-admin-root"]');
}

async function waitForJobsTableSettled(page: Page): Promise<void> {
	const loading = page.locator('[data-testid="jobs-table-loading"]');
	await loading
		.waitFor({ state: 'visible', timeout: 200 })
		.catch(() => undefined);
	await loading
		.waitFor({ state: 'detached', timeout: 20000 })
		.catch(() => undefined);
}

test.describe.serial('Jobs admin overview', () => {
	const createdJobIds: number[] = [];

	test.beforeEach(async ({ requestUtils, kernel }) => {
		await requestUtils.activatePlugin('wp-kernel-showcase');

		// Clear all existing jobs before each test for isolation
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		try {
			const response = await requestUtils.rest({
				path: '/wp-kernel-showcase/v1/jobs',
				method: 'GET',
			});

			if (Array.isArray(response)) {
				for (const job of response) {
					if (job.id) {
						try {
							await jobResource.remove(job.id);
						} catch (error) {
							console.warn(
								`Failed to clear job ${job.id}:`,
								error
							);
						}
					}
				}
			}
		} catch (error) {
			console.warn('Failed to clear jobs in beforeEach:', error);
		}
	});

	test.afterEach(async ({ kernel }) => {
		if (createdJobIds.length === 0) {
			return;
		}

		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		for (const id of createdJobIds.splice(0, createdJobIds.length)) {
			try {
				await jobResource.remove(id);
			} catch (error) {
				console.warn(`Failed to cleanup job ${id}:`, error);
			}
		}
	});

	test('renders jobs and supports search filtering', async ({
		page,
		kernel,
	}) => {
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		const seeded = await jobResource.seed({
			title: 'Designer Showcase Role',
			department: 'Design',
			status: 'publish',
		});
		createdJobIds.push(seeded.id);

		await openJobsPage(page);
		await waitForJobsTableSettled(page);
		await page.waitForSelector('[data-testid^="jobs-table-row-"]', {
			state: 'visible',
		});

		await page.fill('[data-testid="jobs-search-input"]', 'Designer');
		await waitForJobsTableSettled(page);
		await expect(
			page.locator(`[data-testid="jobs-table-row-${seeded.id}"]`)
		).toBeVisible({ timeout: 20000 });

		await page.fill(
			'[data-testid="jobs-search-input"]',
			'Nonexistent role'
		);
		// Wait for React to re-render with filtered results
		await page.waitForTimeout(100);
		await expect(
			page.locator('[data-testid="jobs-table-empty"]')
		).toBeVisible({ timeout: 10000 });
	});

	test('filters by status when draft postings exist', async ({
		page,
		kernel,
	}) => {
		const jobResource = kernel.resource<Job>(JOB_RESOURCE_CONFIG);
		const draftJob = await jobResource.seed({
			title: 'Draft Support Engineer',
			department: 'Support',
			status: 'draft',
		});
		createdJobIds.push(draftJob.id);

		await openJobsPage(page);
		await page.selectOption('[data-testid="jobs-status-select"]', 'draft');
		await waitForJobsTableSettled(page);

		await expect(
			page.locator(`[data-testid="jobs-table-row-${draftJob.id}"]`)
		).toBeVisible({ timeout: 20000 });

		// Ensure only draft jobs are shown (check that table has exactly 1 row)
		await expect(
			page.locator('[data-testid^="jobs-table-row-"]')
		).toHaveCount(1);

		await page.fill(
			'[data-testid="jobs-search-input"]',
			'Nonexistent role'
		);
		await waitForJobsTableSettled(page);
		await expect(
			page.locator('[data-testid="jobs-table-empty"]')
		).toBeVisible({ timeout: 20000 });
	});
});
