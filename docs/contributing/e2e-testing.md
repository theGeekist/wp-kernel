# E2E Testing Guide

End-to-end testing guide for WPKernel with `@wpkernel/e2e-utils`.

## Overview

E2E tests validate complete user workflows in a real WordPress environment using Playwright. WPKernel provides specialized utilities to make testing wpk-aware applications fast and reliable.

### When to Use E2E Tests

- ✓ **Full user workflows** - Login → Create → View → Delete
- ✓ **Integration points** - Resources + Store + UI interactions
- ✓ **Event flow validation** - Ensure events emit correctly
- ✓ **Cross-browser behavior** - Chrome, Firefox, Safari
- ✓ **Admin + Frontend** - Test both surfaces

### When to Use Unit Tests Instead

- ✗ Individual functions/utilities
- ✗ Business logic in isolation
- ✗ Error handling paths
- ✗ Fast feedback loops

See [Testing Guide](/contributing/testing) for unit test patterns.

---

## Quick Start

### Installation

```bash
npm install -D @wpkernel/e2e-utils
# or
pnpm add -D @wpkernel/e2e-utils
```

### Basic Test

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test.describe('Jobs Admin', () => {
	test.beforeEach(async ({ admin, page }) => {
		// Login before each test using the base Playwright admin fixture
		await admin.login();
	});

	test('displays seeded jobs', async ({ wpk, page, requestUtils }) => {
		// Define a resource configuration for the 'job' resource
		const jobResourceConfig = {
			name: 'job',
			routes: {
				create: { path: '/wp/v2/jobs', method: 'POST' },
				list: { path: '/wp/v2/jobs', method: 'GET' },
				remove: { path: '/wp/v2/jobs/:id', method: 'DELETE' },
			},
		};

		// Create a resource helper using the WPKernel fixture
		const jobHelper = wpk.resource(jobResourceConfig);

		// Seed test data using the resource helper
		await jobHelper.seed({ title: 'Senior Engineer' });

		// Navigate to admin page
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// Assert UI state
		await expect(page.locator('text=Senior Engineer')).toBeVisible();
	});
});
```

---

## The WPKernel Fixture

WPKernel E2E utilities are available via the `wpk` fixture. This fixture provides factory functions to create specialized helpers for interacting with WPKernel resources, stores, events, and DataViews.

```typescript
test('example', async ({ wpk, page, admin, requestUtils }) => {
	// Use the base Playwright admin fixture for login
	await admin.login();

	// Create a resource helper
	const jobResource = wpk.resource({
		name: 'job',
		routes: {
			create: { path: '/wp/v2/jobs', method: 'POST' },
		},
	});
	await jobResource.seed({ title: 'Test' });

	// Create a store helper
	const jobStore = wpk.store('wpk/job');
	await jobStore.wait((s) => s.getById(1));

	// Create an event recorder
	const eventRecorder = await wpk.events();
	// Assuming capture is a method on the recorder, if not, adjust
	// await eventRecorder.capture(page);

	// Create a DataView helper
	const jobDataView = wpk.dataview({ resource: 'job' });
	await jobDataView.waitForLoaded();
});
```

### Why a Fixture?

- **Automatic setup/teardown** - Utilities initialize per test
- **Type safety** - Full TypeScript support
- **WordPress integration** - Access to `requestUtils` for REST
- **Consistent API** - Same patterns across all tests

---

## API Reference

### Resource Utilities (`wpk.resource(config)`)

The `wpk.resource()` factory creates helpers for managing WPKernel resources, including seeding data and cleaning up.

#### `wpk.resource(config).seed(data)`

Create a single resource via REST.

```typescript
const jobResourceConfig = {
	name: 'job',
	routes: { create: { path: '/wp/v2/jobs', method: 'POST' } },
};
const jobHelper = wpk.resource(jobResourceConfig);
const job = await jobHelper.seed({
	title: 'Senior Engineer',
	department: 'Engineering',
	salary_min: 100000,
});

console.log(job.id); // Created resource ID
```

**Parameters:**

- `config` - A `WPKernelResourceConfig` object defining the resource (name, routes, store options).
- `data` - Resource data object.

**Returns:** `Promise<T & { id: string | number }>` - Created resource with ID.

#### `wpk.resource(config).seedMany(rows)`

Create multiple resources via REST.

```typescript
const jobResourceConfig = {
	name: 'job',
	routes: { create: { path: '/wp/v2/jobs', method: 'POST' } },
};
const jobHelper = wpk.resource(jobResourceConfig);
const jobs = await jobHelper.seedMany([
	{ title: 'Engineer' },
	{ title: 'Designer' },
	{ title: 'Manager' },
]);

console.log(jobs.length); // 3
```

**Parameters:**

- `config` - A `WPKernelResourceConfig` object.
- `rows` - Array of resource data objects.

**Returns:** `Promise<Array<T & { id: string | number }>>` - Array of created resources.

#### `wpkernel.resource(config).remove(id)`

Remove a single resource by ID.

```typescript
const jobResourceConfig = {
	name: 'job',
	routes: { remove: { path: '/wp/v2/jobs/:id', method: 'DELETE' } },
};
const jobHelper = wpkernel.resource(jobResourceConfig);
await jobHelper.remove(123);
```

**Parameters:**

- `config` - A `WPKernelResourceConfig` object.
- `id` - Resource ID to delete.

**Returns:** `Promise<void>`

#### `wpkernel.resource(config).deleteAll()`

Delete all resources of the configured type. **Use with caution.**

```typescript
const jobResourceConfig = {
	name: 'job',
	routes: {
		list: { path: '/wp/v2/jobs', method: 'GET' },
		remove: { path: '/wp/v2/jobs/:id', method: 'DELETE' },
	},
};
const jobHelper = wpkernel.resource(jobResourceConfig);
await jobHelper.deleteAll();
```

**Parameters:**

- `config` - A `WPKernelResourceConfig` object.

**Returns:** `Promise<void>`

---

### Store Utilities (`wpkernel.store(storeKey)`)

The `wpkernel.store()` factory creates helpers for interacting with WPKernel data stores, primarily for waiting on state changes.

#### `wpkernel.store(storeKey).wait(selector, timeout?)`

Wait for a WPKernel store selector to return a truthy value.

```typescript
// Wait for job to exist in store
const jobStore = wpkernel.store('wpk/job');
const job = await jobStore.wait((selectors) => selectors.getById(123), 5000);

// Wait for list to load
const jobs = await jobStore.wait((selectors) => selectors.getList());
```

**Parameters:**

- `storeKey` - WordPress data store key (e.g., `'wpk/job'`).
- `selector` - Function that receives store state and returns the desired value.
- `timeout` - Max wait time in milliseconds (default: `5000`).

**Returns:** `Promise<R>` - Resolved data from the selector.

#### `wpkernel.store(storeKey).invalidate()`

Invalidate the store cache to trigger a refetch.

```typescript
const jobStore = wpkernel.store('wpk/job');
await jobStore.invalidate();
```

**Parameters:**

- `storeKey` - WordPress data store key.

**Returns:** `Promise<void>`

#### `wpkernel.store(storeKey).getState()`

Get the current state of the store.

```typescript
const jobStore = wpkernel.store('wpk/job');
const state = await jobStore.getState();
console.log(state.items);
```

**Parameters:**

- `storeKey` - WordPress data store key.

**Returns:** `Promise<T>` - Current state object.

---

### Event Utilities (`wpkernel.events(options?)`)

The `wpkernel.events()` factory creates an event recorder for capturing and asserting on WPKernel events.

#### `wpkernel.events(options?).capture(page)`

Start capturing events emitted during test execution.

```typescript
const eventRecorder = await wpkernel.events({
	pattern: /^wpk\./, // Only capture wpk events
});

// Perform action that emits events
// ...

// Check events
const created = eventRecorder.find('wpk.job.created');
expect(created).toBeTruthy();

// Cleanup
await eventRecorder.stop();
```

**Parameters:**

- `options.pattern` - RegExp to filter event names (default: captures all).
- `options.includePayload` - Whether to capture event payloads (default: `true`).

**Returns:** `Promise<EventRecorder>`

**EventRecorder API:**

```typescript
interface EventRecorder {
	list(): Promise<CapturedEvent<P>[]>;
	find(name: string): Promise<CapturedEvent<P> | undefined>;
	findAll(name: string): Promise<CapturedEvent<P>[]>;
	clear(): Promise<void>;
	stop(): Promise<void>;
}
```

---

### DataView Utilities (`wpkernel.dataview(options)`)

The `wpkernel.dataview()` factory creates helpers for interacting with WPKernel's DataView UI components.

#### `wpkernel.dataview(options).root()`

Returns a Playwright `Locator` for the root of the DataView component.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await expect(jobDataView.root()).toBeVisible();
```

**Parameters:**

- `options.resource` - Resource name used to locate the DataView wrapper.
- `options.namespace` - Optional namespace attribute to disambiguate multiple runtimes.
- `options.within` - Optional CSS selector limiting the search scope.

**Returns:** `Locator`

#### `wpkernel.dataview(options).waitForLoaded()`

Waits until the DataView reports that its loading state has finished.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await jobDataView.waitForLoaded();
```

**Returns:** `Promise<void>`

#### `wpkernel.dataview(options).search(value)`

Fills the search input of the DataView and presses Enter.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await jobDataView.search('Senior Engineer');
```

**Returns:** `Promise<void>`

#### `wpkernel.dataview(options).clearSearch()`

Clears the search input of the DataView.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await jobDataView.clearSearch();
```

**Returns:** `Promise<void>`

#### `wpkernel.dataview(options).getRow(text)`

Retrieves a Playwright `Locator` for a row containing the provided text.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
const row = jobDataView.getRow('Senior Engineer');
await expect(row).toBeVisible();
```

**Returns:** `Locator`

#### `wpkernel.dataview(options).selectRow(text)`

Toggles selection for a row that matches the provided text.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await jobDataView.selectRow('Senior Engineer');
```

**Returns:** `Promise<void>`

#### `wpkernel.dataview(options).runBulkAction(label)`

Triggers a bulk action button by its visible label.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
await jobDataView.runBulkAction('Delete Selected');
```

**Returns:** `Promise<void>`

#### `wpkernel.dataview(options).getSelectedCount()`

Reads the number of selected items displayed in the bulk actions footer.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
const count = await jobDataView.getSelectedCount();
expect(count).toBe(1);
```

**Returns:** `Promise<number>`

#### `wpkernel.dataview(options).getTotalCount()`

Reads the total item count exposed by the DataView wrapper metadata.

```typescript
const jobDataView = wpkernel.dataview({ resource: 'job' });
const count = await jobDataView.getTotalCount();
expect(count).toBeGreaterThan(0);
```

**Returns:** `Promise<number>`

---

## Common Patterns

### Seeding Test Data

```typescript
test.describe('Job Applications', () => {
	let job;
	const jobResourceConfig = {
		name: 'job',
		routes: {
			create: { path: '/wp/v2/jobs', method: 'POST' },
			list: { path: '/wp/v2/jobs', method: 'GET' },
			remove: { path: '/wp/v2/jobs/:id', method: 'DELETE' },
		},
	};

	test.beforeEach(async ({ wpkernel }) => {
		// Seed job before each test using the resource helper
		const jobHelper = wpkernel.resource(jobResourceConfig);
		job = await jobHelper.seed({
			title: 'Test Job',
			status: 'publish',
		});
	});

	test('should submit application', async ({ page }) => {
		await page.goto(`/jobs/${job.id}`);
		// ... test application flow
	});
});
```

### Waiting for Store Updates

```typescript
test('should update job list after create', async ({ page, wpk }) => {
	// Initial state
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');

	// Trigger create
	await page.click('[data-testid="new-job-button"]');
	// ... fill form ...
	await page.click('[data-testid="save-button"]');

	// Wait for store to update
	const jobs = await wpkernel.store.wait(
		page,
		'wpk/job',
		(s) => s.getList(),
		{
			timeoutMs: 3000,
		}
	);

	expect(jobs.length).toBeGreaterThan(0);
});
```

### Event Flow Validation

```typescript
test('should emit events on job creation', async ({ page, wpk }) => {
	const recorder = await wpkernel.events.capture(page, {
		pattern: /^wpk\.job\./,
	});

	// Trigger action
	await wpkernel.rest.seed(requestUtils, 'job', { title: 'Test' });

	// Validate events
	const events = recorder.list();
	expect(events.map((e) => e.name)).toEqual([
		'wpk.resource.request',
		'wpk.resource.response',
		'wpk.job.created', // Emitted by Action after the reporting upgrade
		'wpk.cache.invalidated',
	]);

	await recorder.stop();
});
```

### Database Isolation

```typescript
test.describe('Stateful Tests', () => {
	test.beforeAll(async ({ wpk }) => {
		// Setup baseline once
		await wpkernel.db.restore('clean');
		await wpkernel.rest.seedMany(requestUtils, 'job', baselineJobs);
		await wpkernel.db.snapshot('baseline');
	});

	test.beforeEach(async ({ wpk }) => {
		// Restore to baseline before each test
		await wpkernel.db.restore('baseline');
	});

	test('test 1', async ({ page }) => {
		// Modify data...
	});

	test('test 2', async ({ page }) => {
		// Starts from baseline, not test 1's state
	});
});
```

---

## Test Organization

### Directory Structure

```
examples/showcase/
  tests/
    e2e/              # Domain E2E tests
      jobs/
        list.spec.ts
        detail.spec.ts
        apply.spec.ts
      applications/
        pipeline.spec.ts
      fixtures/
        jobs.ts
        users.ts

packages/e2e-utils/
  tests/              # Utility unit tests
    auth/
      login.spec.ts
    rest/
      seed.spec.ts
```

### Utility Tests vs Domain Tests

**Utility Tests** (`packages/e2e-utils/tests/*`)

- Test the utility functions themselves
- Validate wpk integration
- No domain logic

**Domain Tests** (`examples/showcase/tests/e2e/*`)

- Test product features
- Use utilities as helpers
- Domain-specific assertions

---

## Debugging

### Enable Headed Mode

```bash
# Run with browser UI
pnpm e2e:headed

# Run with Playwright UI
pnpm e2e:ui
```

### Slow Down Execution

```typescript
test.use({ slowMo: 1000 }); // 1 second between actions
```

### Screenshot on Failure

```typescript
test.afterEach(async ({ page }, testInfo) => {
	if (testInfo.status !== 'passed') {
		await page.screenshot({
			path: `test-results/${testInfo.title}.png`,
		});
	}
});
```

### Console Logs

```typescript
test('debug', async ({ page }) => {
	page.on('console', (msg) => console.log('Browser:', msg.text()));
	// ... test code
});
```

### Pause Execution

```typescript
await page.pause(); // Opens Playwright Inspector
```

---

## Configuration

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	use: {
		baseURL: 'http://localhost:8889',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { channel: 'chromium' } },
		{ name: 'firefox', use: { browserName: 'firefox' } },
		{ name: 'webkit', use: { browserName: 'webkit' } },
	],
});
```

### WordPress Environment

Tests run against wp-env (configured in `.wp-env.json`):

```json
{
	"core": "WordPress/WordPress#6.7.4",
	"plugins": ["./examples/showcase"],
	"port": 8888,
	"testsPort": 8889
}
```

**Dev site:** http://localhost:8888 (manual testing)  
**Tests site:** http://localhost:8889 (automated tests)

---

## CI Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - uses: actions/setup-node@v4
              with:
                  node-version: '22'
                  cache: 'pnpm'

            - run: pnpm install
            - run: pnpm build

            # Start WordPress
            - run: pnpm wp:start
            - run: pnpm wp:seed

            # Install Playwright browsers
            - run: npx playwright install --with-deps chromium

            # Run E2E tests
            - run: pnpm e2e

            # Upload reports on failure
            - uses: actions/upload-artifact@v4
              if: failure()
              with:
                  name: playwright-report
                  path: playwright-report/
```

---

## Best Practices

### ✓ DO

- **Use fixtures** - Leverage the `wpkernel` fixture for all utilities
- **Seed data** - Create test data via REST, not database manipulation
- **Wait for state** - Use `wpkernel.store.wait()` instead of arbitrary delays
- **Test user flows** - Focus on complete workflows, not implementation
- **Restore database** - Use `wpkernel.db.restore()` for test isolation
- **Capture events** - Validate event emission for critical actions

### ✗ DON'T

- **Direct database access** - Use REST utilities instead
- **Hardcoded waits** - Use `waitForSelector` or store waiting
- **Test internals** - Focus on observable behavior
- **Share state** - Each test should be independent
- **Skip CI** - All E2E tests must pass for merge

---

## Troubleshooting

### Test Timeouts

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page, wpk }) => {
	test.setTimeout(30000); // 30 seconds

	await wpkernel.rest.seedMany(requestUtils, 'job', largeDataset);
});
```

### Store Not Ready

```typescript
// Wait for store to initialize before accessing
await wpkernel.store.wait(page, 'wpk/job', (s) => s.getList() !== undefined, {
	timeoutMs: 1000,
});
```

### REST Seeding Fails

```typescript
// Ensure WordPress is running
await wpkernel.project.setup({ site: 'tests' });

// Check authentication
await wpkernel.auth.login(page);

// Verify REST endpoint exists
const response = await wpkernel.rest.request(
	requestUtils,
	'OPTIONS',
	'/wpk/v1/jobs'
);
console.log(response.headers);
```

---

## See Also

- [Testing Guide](/contributing/testing) - Unit testing patterns
- [Showcase Tests](https://github.com/wpkernel/wpkernel/tree/main/examples/showcase/tests/e2e) - Real-world examples
- [Playwright Docs](https://playwright.dev/) - Official Playwright documentation
- [@wordpress/e2e-test-utils-playwright](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-e2e-test-utils-playwright/) - WordPress E2E utilities
