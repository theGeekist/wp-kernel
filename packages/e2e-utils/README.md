# @geekist/wp-kernel-e2e-utils

> E2E testing utilities for WP Kernel projects

## Overview

Testing helpers and fixtures for end-to-end testing of WP Kernel applications using Playwright and WordPress E2E utilities.

## Installation

```bash
npm install --save-dev @geekist/wp-kernel-e2e-utils
# or
pnpm add -D @geekist/wp-kernel-e2e-utils
```

## Peer Dependencies

This package requires:

- `@geekist/wp-kernel` (the core framework)
- `@playwright/test` (Playwright test runner)
- `@wordpress/e2e-test-utils-playwright` (WordPress E2E helpers)

## Usage

### Test Setup

```typescript
import { test, expect } from '@playwright/test';
import { createResource, triggerAction } from '@geekist/wp-kernel-e2e-utils';

test.describe('Post Management', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/wp-admin');
	});

	test('should create a post via action', async ({ page }) => {
		await triggerAction(page, 'Post.Create', {
			title: 'Test Post',
			content: 'Test content',
		});

		await expect(page.locator('.notice-success')).toBeVisible();
	});
});
```

### Fixtures

```typescript
import { wpKernelTest } from '@geekist/wp-kernel-e2e-utils/fixtures';

wpKernelTest('should display resource data', async ({ resource }) => {
	// Resource fixture provides seeded data
	const posts = await resource('post').list();
	expect(posts).toHaveLength(3);
});
```

### Page Object Models

```typescript
import { ResourceListPage } from '@geekist/wp-kernel-e2e-utils/pages';

test('should filter resources', async ({ page }) => {
	const listPage = new ResourceListPage(page, 'post');
	await listPage.goto();
	await listPage.applyFilter('status', 'published');
	await listPage.expectItemCount(5);
});
```

## Utilities (Coming Soon)

### Action Testing

- `triggerAction()` - Trigger WP Kernel actions
- `waitForActionComplete()` - Wait for action to finish
- `expectActionSuccess()` - Assert action succeeded

### Resource Testing

- `seedResource()` - Seed test data
- `assertResourceState()` - Check resource cache state
- `waitForResourceUpdate()` - Wait for cache invalidation

### Event Testing

- `captureEvents()` - Record emitted events
- `expectEventEmitted()` - Assert event was fired
- `mockEventHandler()` - Mock event listeners

### Block Testing

- `insertBlock()` - Insert block with bindings
- `updateBinding()` - Change binding values
- `expectBindingValue()` - Assert binding displays correctly

### Interactivity Testing

- `triggerInteraction()` - Trigger interactivity action
- `assertInteractivityState()` - Check state updates
- `expectDOMUpdate()` - Verify DOM changes

## Configuration

Create `e2e.config.js`:

```javascript
export default {
	baseURL: 'http://localhost:8888',
	apiEndpoint: '/wp-json',
	fixtures: {
		users: true,
		posts: 10,
		customPosts: './fixtures/posts.json',
	},
};
```

## Example Test Suite

```typescript
import { test, expect } from '@playwright/test';
import {
	seedResource,
	triggerAction,
	expectEventEmitted,
} from '@geekist/wp-kernel-e2e-utils';

test.describe('Job Queue', () => {
	test.beforeAll(async () => {
		await seedResource('job', [
			{ name: 'ProcessQueue', status: 'pending' },
		]);
	});

	test('should process jobs', async ({ page }) => {
		const events = await captureEvents(page);

		await triggerAction(page, 'Job.Process', { id: 1 });

		await expectEventEmitted(events, 'wpk.job.completed');
		await expect(page.locator('.job-status')).toHaveText('Complete');
	});
});
```

## Documentation

For complete documentation, see the [main repository](https://github.com/theGeekist/wp-kernel).

## License

MIT © [The Geekist](https://github.com/theGeekist)
