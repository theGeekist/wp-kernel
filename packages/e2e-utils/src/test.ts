/**
 * WP Kernel E2E Test Fixture
 *
 * Extended Playwright test with kernel utilities pre-configured.
 * Extends @wordpress/e2e-test-utils-playwright with kernel fixture.
 *
 * @module
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright's fixture API uses `use` callback, not React Hooks

import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { createKernelUtils } from './createKernelUtils.js';
import type { KernelUtils } from './types.js';

/**
 * Extended test fixture with kernel utilities
 *
 * Provides all WordPress E2E fixtures plus:
 * - `kernel`: Kernel utilities factory for resources, stores, and events
 *
 * @example
 * ```typescript
 * import { test, expect } from '@geekist/wp-kernel-e2e-utils';
 *
 * test('job workflow', async ({ admin, kernel, page }) => {
 *   await admin.visitAdminPage('admin.php', 'page=wpk-jobs');
 *
 *   const job = kernel.resource({ name: 'job', routes: {...} });
 *   await job.seed({ title: 'Engineer' });
 *
 *   const jobStore = kernel.store('wpk/job');
 *   await jobStore.wait(s => s.getList());
 *
 *   await expect(page.getByText('Engineer')).toBeVisible();
 * });
 * ```
 */
export const test = base.extend<{ kernel: KernelUtils }>({
	kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
		const kernel = createKernelUtils({
			page,
			requestUtils,
			admin,
			editor,
			pageUtils,
		});

		await use(kernel);
	},
});

// Re-export expect from Playwright
export { expect };
