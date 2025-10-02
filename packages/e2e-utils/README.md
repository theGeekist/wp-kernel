# @geekist/wp-kernel-e2e-utils

E2E testing utilities for WP Kernel projects built on top of `@wordpress/e2e-test-utils-playwright`.

---

## Current E2E Setup (Analysis)

### Status: Pre-Sprint 2

The monorepo currently has E2E tests configured but **does NOT yet use WordPress E2E utilities** or kernel-specific helpers.

#### Configuration

- **Playwright Config**: Root-level `playwright.config.ts`
- **Test Location**: `app/showcase/__tests__/e2e/*.spec.ts`
- **Target Environment**: wp-env on `http://localhost:8889` (tests site)
- **Browsers**: chromium, firefox, webkit
- **Test Pattern**: `*.spec.ts` files only

#### Current Test Implementation

Existing tests use **vanilla Playwright** with manual helper functions:

```typescript
// app/showcase/__tests__/e2e/sanity.spec.ts
import { test, expect } from '@playwright/test'; // ❌ NOT using WordPress utils

// Manual helper (duplicated across test files)
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('input[name="log"]', 'admin');
	await page.fill('input[name="pwd"]', 'password');
	await page.click('input[name="wp-submit"]');
	await page.waitForURL('**/wp-admin/**');
}

// Manual error tracking (duplicated)
async function setupConsoleErrorTracking(page: Page) {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});
	return () => errors;
}

test('WordPress admin loads', async ({ page }) => {
	await loginToWordPress(page); // Manual implementation
	await expect(page.locator('#wpadminbar')).toBeVisible();
});
```

#### What's Missing

Despite having `@wordpress/e2e-test-utils-playwright@^1.31.0` installed:

1. **No fixture pattern** - Tests don't use `admin`, `editor`, `requestUtils`, `pageUtils` fixtures
2. **Manual login** - `loginToWordPress()` helper duplicated instead of using `admin.visitAdminPage()`
3. **No REST utilities** - No `requestUtils.rest()` for seeding data via API
4. **Manual error tracking** - Console error tracking implemented per-test instead of using WordPress fixtures
5. **No kernel-specific helpers** - No utilities for resources, stores, or events

#### Example Current Test

```typescript
// app/showcase/__tests__/e2e/sprint-1-resources.spec.ts
test.describe('Sprint 1 — Resources', () => {
	test.beforeEach(async ({ page }) => {
		await loginToWordPress(page); // Manual helper
	});

	test('Jobs admin page renders with store data', async ({ page }) => {
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');
		await page.waitForSelector('.wpk-jobs-list');

		// No store utilities - just waiting for DOM
		const jobCards = page.locator('.wpk-job-card');
		await expect(jobCards).toHaveCount(5);
	});
});
```

### Sprint 2 Goals

Sprint 2 will transform this setup by:

1. **Creating kernel fixtures** via a single factory pattern
2. **Extending WordPress test fixture** to include `kernel` helper
3. **Migrating showcase tests** to use new utilities (confirmed in Task 3 acceptance criteria)
4. **Eliminating manual helpers** in favor of WordPress + kernel fixtures

---

## Installation

```bash
pnpm add -D @geekist/wp-kernel-e2e-utils
```

## Peer Dependencies

- `@geekist/wp-kernel` (core framework)
- `@playwright/test` (Playwright test runner)
- `@wordpress/e2e-test-utils-playwright` (WordPress E2E helpers)

---

## Usage (Post-Sprint 2)

After Sprint 2 implementation, tests will use the single factory pattern:

### Basic Test with Kernel Fixtures

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test('should load jobs', async ({ page, admin, kernel }) => {
	// ✅ Use WordPress fixture for login
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');

	// ✅ Use kernel resource helper for seeding
	const job = kernel.resource({
		name: 'job',
		routes: {
			create: { path: '/wpk/v1/jobs', method: 'POST' },
			remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
		},
	});
	await job.seed({ title: 'Software Engineer', salary: 100000 });

	// ✅ Use kernel store helper to wait for data
	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((state) => state.getList());

	// ✅ Use kernel events helper to capture emissions
	const recorder = await kernel.events({ pattern: /^wpk\.job\./ });

	// Assertions
	await expect(page.getByText('Software Engineer')).toBeVisible();

	const events = recorder.list();
	expect(events).toContainEqual(
		expect.objectContaining({ type: 'wpk.job.created' })
	);
});
```

---

## Single Factory Pattern

The `kernel` fixture is created by a single factory that extends WordPress fixtures:

```typescript
import { test as base } from '@wordpress/e2e-test-utils-playwright';
import { createKernelUtils } from '@geekist/wp-kernel-e2e-utils';

export const test = base.extend({
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

export { expect } from '@playwright/test';
```

All WordPress fixtures are always available alongside the kernel fixture.

---

## Available Helpers

### Resource Utilities

Create typed resource helpers for seeding and cleanup:

```typescript
const job = kernel.resource({
	name: 'job',
	routes: {
		create: { path: '/wpk/v1/jobs', method: 'POST' },
		remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
	},
});

// Methods
await job.seed({ title: 'Engineer' }); // Create via REST
await job.seedMany([{ title: 'Dev' }, { title: 'Designer' }]); // Bulk create
await job.remove(id); // Delete one
await job.deleteAll(); // Cleanup all test data
```

### Store Utilities

Wait for store resolvers and inspect state:

```typescript
const jobStore = kernel.store('wpk/job');

// Methods
await jobStore.wait((state) => state.getList()); // Wait for resolver to finish
await jobStore.invalidate(); // Trigger refetch
const data = await jobStore.getState(); // Get current state
```

### Event Utilities

Capture and assert on kernel events:

```typescript
const recorder = await kernel.events({
	pattern: /^wpk\.job\./, // Optional filter
});

// Methods
recorder.list(); // All captured events
recorder.find('wpk.job.created'); // First matching event
recorder.findAll('wpk.job.updated'); // All matching events
recorder.clear(); // Reset recorded events
recorder.stop(); // Stop recording
```

---

## WordPress Fixtures (Always Available)

All `@wordpress/e2e-test-utils-playwright` fixtures are exposed:

```typescript
test('example', async ({
	page,
	admin,
	editor,
	requestUtils,
	pageUtils,
	kernel,
}) => {
	// WordPress fixtures
	await admin.visitAdminPage('index.php');
	await admin.createNewPost();
	await editor.insertBlock({ name: 'core/paragraph' });

	// REST API
	const posts = await requestUtils.rest({ path: '/wp/v2/posts' });

	// Kernel fixtures
	const job = kernel.resource(jobConfig);
	await job.seed({ title: 'Test Job' });

	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((s) => s.getList());
});
```

---

## Migration Path

### Before (Current — vanilla Playwright)

```typescript
import { test, expect } from '@playwright/test';

// Manual helper (duplicated)
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('input[name="log"]', 'admin');
	await page.fill('input[name="pwd"]', 'password');
	await page.click('input[name="wp-submit"]');
	await page.waitForURL('**/wp-admin/**');
}

test.beforeEach(async ({ page }) => {
	await loginToWordPress(page);
});

test('jobs page works', async ({ page }) => {
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	await page.waitForSelector('.wpk-jobs-list');
	const jobCards = page.locator('.wpk-job-card');
	await expect(jobCards).toHaveCount(5);
});
```

### After (Post-Sprint 2 — WordPress + kernel fixtures)

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test('jobs page works', async ({ admin, page, kernel }) => {
	// ✅ Use WordPress fixture (no manual login)
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');

	// ✅ Use kernel store helper to wait for data (instead of DOM selector)
	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((state) => state.getList());

	// ✅ Assert on store state instead of DOM count
	const data = await jobStore.getState();
	expect(data.list).toHaveLength(5);

	// Can still assert on DOM if needed
	await expect(page.locator('.wpk-jobs-list')).toBeVisible();
});
```

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

EUPL-1.2
