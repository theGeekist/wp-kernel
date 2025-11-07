# Migration Guide: Using WPKernel E2E Utils

This guide shows how to migrate from vanilla Playwright tests to using WPKernel E2E Utils with WordPress fixtures.

## Before: Vanilla Playwright

```typescript
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Manual login helper
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('input[name="log"]', 'admin');
	await page.fill('input[name="pwd"]', 'password');
	await page.click('input[type="submit"]');
	await page.waitForLoadState('networkidle');
}

test('should access admin', async ({ page }) => {
	await loginToWordPress(page);
	await page.goto('/wp-admin/');
	await expect(page.locator('#wpbody')).toBeVisible();
});
```

## After: WPKernel E2E Utils

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test('should access admin', async ({ admin, page }) => {
	// WordPress fixtures handle login automatically
	await admin.visitAdminPage('index.php');
	await expect(page.locator('#wpbody')).toBeVisible();
});
```

## Available Fixtures

When you import `test` from `@wpkernel/e2e-utils`, you get:

### WordPress Fixtures (from `@wordpress/e2e-test-utils-playwright`)

- `page` - Playwright Page instance
- `admin` - Admin utilities (visitAdminPage, etc.)
- `editor` - Block editor utilities
- `pageUtils` - Page manipulation helpers
- `requestUtils` - REST API client

### Kernel Fixture (new!)

- `kernel` - WPKernel utilities factory

## Using Kernel Utilities

### Resource Utilities

```typescript
test('should seed and verify job', async ({ kernel, page, admin }) => {
	// Define resource
	const job = kernel.resource({
		name: 'job',
		routes: {
			list: { path: '/wpk/v1/jobs', method: 'GET' },
			create: { path: '/wpk/v1/jobs', method: 'POST' },
			remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
		},
	});

	// Seed test data via REST
	await job.seed({ title: 'Engineer', department: 'Tech' });

	// Navigate and verify
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');
	await expect(page.getByText('Engineer')).toBeVisible();

	// Cleanup
	await job.deleteAll();
});
```

### Store Utilities

```typescript
test('should wait for store state', async ({ kernel, admin }) => {
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');

	const jobStore = kernel.store('wpk/job');

	// Wait for store to resolve
	const jobs = await jobStore.wait((state) => state.getList());
	expect(jobs).toHaveLength(3);

	// Get current state
	const currentState = await jobStore.getState();
	expect(currentState).toBeDefined();
});
```

### Event Utilities

```typescript
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';

test('should capture events', async ({ kernel, page, admin }) => {
	// Start recording wpk namespace events
	const recorder = kernel.events({
		namespace: WPK_NAMESPACE,
		includePayload: true,
	});

	await recorder.start();

	// Trigger actions that emit events
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');
	await page.click('button[aria-label="Add New Job"]');

	// Verify events were captured
	const created = await recorder.find(`${WPK_NAMESPACE}.job.created`);
	expect(created).toBeDefined();
	expect(created?.payload).toMatchObject({ title: 'New Job' });

	const allEvents = await recorder.list();
	expect(allEvents.length).toBeGreaterThan(0);

	// Stop recording
	await recorder.stop();
});
```

## Advanced: Custom Fixture Setup

For advanced users who need custom configuration:

```typescript
import { test as base, expect } from '@wordpress/e2e-test-utils-playwright';
import { createWPKernelUtils } from '@wpkernel/e2e-utils';

export const test = base.extend({
	kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
		const wpk = createWPKernelUtils({
			page,
			requestUtils,
			admin,
			editor,
			pageUtils,
		});

		// Add custom setup here
		await kernel.events({ namespace: WPK_NAMESPACE }).start();

		await use(kernel);

		// Add custom teardown here
	},
});

export { expect };
```

## Benefits

1. **No manual login** - WordPress fixtures handle authentication
2. **Type-safe REST calls** - Resource utilities with full TypeScript support
3. **Store state testing** - Wait for and verify @wordpress/data store state
4. **Event tracking** - Capture and verify JS hook emissions
5. **Consistent helpers** - Same utilities across all tests
6. **Better test isolation** - Proper setup/teardown with fixtures

## Next Steps

- Migrate existing tests one by one
- Remove manual helper functions (loginToWordPress, etc.)
- Use wpk utilities for data seeding instead of direct REST calls
- Add event verification to action tests
