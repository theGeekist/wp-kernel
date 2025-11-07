/**
 * WPKernel E2E Test Fixture
 *
 * Extended Playwright test with wpk utilities pre-configured.
 * Extends @wordpress/e2e-test-utils-playwright with wpk fixture.
 *
 * @module
 */

/* eslint-disable react-hooks/rules-of-hooks */
// ^ Playwright's fixture API uses `use` callback, not React Hooks

import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { createWPKernelUtils } from './createWPKernelUtils.js';
import type { WPKernelUtils } from './types.js';

/**
 * Extended test fixture with wpk utilities
 *
 * Provides all WordPress E2E fixtures plus:
 * - `kernel`: Kernel utilities factory for resources, stores, and events
 *
 * @category Test Fixtures
 * @example
 * ```typescript
 * import { test, expect } from '@wpkernel/e2e-utils';
 *
 * test('job workflow', async ({ admin, kernel, page }) => {
 *   await admin.visitAdminPage('admin.php', 'page=my-plugin-jobs');
 *
 *   const job = kernel.resource({ name: 'job', routes: {...} });
 *   await job.seed({ title: 'Engineer' });
 *
 *   const jobStore = kernel.store('my-plugin/job');
 *   await jobStore.wait(s => s.getList());
 *
 *   await expect(page.getByText('Engineer')).toBeVisible();
 * });
 * ```
 */
export const test = base.extend<{ kernel: WPKernelUtils }>({
	kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
		const wpk = createWPKernelUtils({
			page,
			requestUtils,
			admin,
			editor,
			pageUtils,
		});

		await use(wpk);
	},
});

// Re-export expect from Playwright
/**
 * Playwright expect instance aligned with the kernel test fixture.
 *
 * @category Test Fixtures
 */
export { expect };
