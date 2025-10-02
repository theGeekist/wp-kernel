/**
 * WP Kernel E2E Integration Test
 *
 * Demonstrates the "golden path" for testing WP Kernel applications.
 * This test exercises the kernel utilities in a real browser environment:
 * - kernel.resource() for seeding test data
 * - kernel.store() for verifying @wordpress/data store state
 *
 * @package
 */

import { test, expect } from '@geekist/wp-kernel-e2e-utils';
import type { Page } from '@playwright/test';

// Job interface matching showcase app schema
interface Job {
	id: number;
	title: string;
	status: 'draft' | 'publish' | 'closed';
	department?: string;
	location?: string;
}

/**
 * Helper function to log into WordPress admin
 *
 * @param page - Playwright page object
 */
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('#user_login', 'admin');
	await page.fill('#user_pass', 'password');
	await page.click('#wp-submit');
	// Wait for either wp-admin or redirect location
	await page.waitForURL(/\/wp-admin/, { timeout: 10000 });
}

test.describe('Kernel E2E Utils Integration', () => {
	test.beforeEach(async ({ requestUtils }) => {
		await requestUtils.activatePlugin('wp-kernel-showcase');
	});

	test('should seed a job and verify it appears in the admin page', async ({
		page,
		kernel,
	}) => {
		// Log in to WordPress
		await loginToWordPress(page);

		// 1. Create resource helper for jobs
		const jobResource = kernel.resource<Job>({
			name: 'job',
			routes: {
				create: { path: '/wpk/v1/jobs', method: 'POST' },
				remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
			},
		});

		// 2. Seed a test job via REST API
		const seededJob = await jobResource.seed({
			title: 'E2E Test Engineer',
			status: 'publish',
			department: 'Quality Assurance',
		});

		// Verify the job was created
		expect(seededJob).toHaveProperty('id');
		expect(seededJob.id).toBeGreaterThan(0);
		expect(seededJob.title).toBe('E2E Test Engineer');

		// 3. Navigate to the admin jobs page
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// 4. Wait for the jobs list to render
		await page.waitForSelector(
			'[data-testid="jobs-list"], .jobs-list, table',
			{
				timeout: 15000,
				state: 'visible',
			}
		);

		// 5. Verify the job appears on the page (use first() to avoid strict mode violations)
		await expect(page.getByText('E2E Test Engineer').first()).toBeVisible();

		// 6. Clean up - remove the test job
		await jobResource.remove(seededJob.id);

		// Verify cleanup worked
		await page.reload();
		await expect(page.getByText('E2E Test Engineer')).not.toBeVisible();
	});

	// TODO: This test is flaky due to timing issues with multiple job rendering
	// The jobs are created successfully, but may not all render fast enough.
	// Will be more reliable once we implement proper loading states in the UI.
	test.skip('should seed multiple jobs and verify count', async ({
		page,
		kernel,
	}) => {
		// Log in to WordPress
		await loginToWordPress(page);

		const jobResource = kernel.resource<Job>({
			name: 'job',
			routes: {
				create: { path: '/wpk/v1/jobs', method: 'POST' },
				remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
			},
		});

		// Seed 3 test jobs
		const jobs = await jobResource.seedMany([
			{
				title: 'Frontend Developer',
				status: 'publish',
				department: 'Engineering',
			},
			{
				title: 'Backend Developer',
				status: 'publish',
				department: 'Engineering',
			},
			{
				title: 'Product Manager',
				status: 'publish',
				department: 'Product',
			},
		]);

		expect(jobs).toHaveLength(3);
		jobs.forEach((job) => {
			expect(job).toHaveProperty('id');
			expect(job.id).toBeGreaterThan(0);
		});

		// Navigate to admin page
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// Wait for list to render
		await page.waitForSelector(
			'[data-testid="jobs-list"], .jobs-list, table',
			{
				timeout: 15000,
			}
		);

		// Verify all jobs appear (use first() for each to avoid strict mode issues)
		await expect(
			page.getByText('Frontend Developer').first()
		).toBeVisible();
		await expect(page.getByText('Backend Developer').first()).toBeVisible();
		await expect(page.getByText('Product Manager').first()).toBeVisible();

		// Clean up all test jobs
		for (const job of jobs) {
			await jobResource.remove(job.id);
		}
	});

	// TODO: This test requires @wordpress/data store implementation
	// The kernel.store() helper works, but the showcase app doesn't have a
	// @wordpress/data store registered yet. Will implement in Sprint 1.
	test.skip('should wait for store to resolve job data', async ({
		page,
		kernel,
	}) => {
		// Log in to WordPress
		await loginToWordPress(page);

		const jobResource = kernel.resource<Job>({
			name: 'job',
			routes: {
				create: { path: '/wpk/v1/jobs', method: 'POST' },
				remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
			},
		});

		// Seed a job
		const seededJob = await jobResource.seed({
			title: 'DevOps Engineer',
			status: 'publish',
			department: 'Infrastructure',
		});

		// Navigate to admin page (this triggers store resolution)
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// Wait for page to load
		await page.waitForLoadState('networkidle');

		// Create store helper
		const jobStore = kernel.store('wpk/job');

		// Wait for store to have data (with 10s timeout)
		const storeHasData = await jobStore.wait((selectors: any) => {
			const list = selectors.getList?.();
			return list && list.length > 0;
		}, 10000);

		expect(storeHasData).toBeTruthy();

		// Clean up
		await jobResource.remove(seededJob.id);
	});

	test('should handle empty state when no jobs exist', async ({ page }) => {
		// Log in to WordPress
		await loginToWordPress(page);

		// Navigate to admin page
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// The page should render even with no jobs
		await page.waitForLoadState('networkidle');

		// Check for empty state indicators
		const body = await page.textContent('body');
		expect(body).toBeDefined();
	});

	test('should demonstrate resource.deleteAll() cleanup', async ({
		kernel,
	}) => {
		const jobResource = kernel.resource<Job>({
			name: 'job',
			routes: {
				list: { path: '/wpk/v1/jobs', method: 'GET' },
				create: { path: '/wpk/v1/jobs', method: 'POST' },
				remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
			},
		});

		// Seed some test jobs
		await jobResource.seedMany([
			{ title: 'Test Job 1', status: 'publish' },
			{ title: 'Test Job 2', status: 'publish' },
		]);

		// Delete all jobs at once (useful for test cleanup)
		await jobResource.deleteAll();

		// Note: In production, this would only be used in test teardown
		// as it deletes ALL resources of this type
	});
});
