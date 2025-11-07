# @wpkernel/e2e-utils

> Playwright-based end-to-end testing utilities for WordPress + WP Kernel projects.

## Overview

The utilities extend `@playwright/test` with WordPress-aware fixtures and kernel helpers so E2E
suites can seed resources, capture events, and validate caches without bespoke plumbing. The
package is optional - install it when you want to exercise kernel-powered interfaces against a real
WordPress environment.

## Quick links

- [Package guide](../../docs/packages/e2e-utils.md)
- [API reference](../../docs/api/@wpkernel/e2e-utils/README.md)
- [Testing patterns](../../tests/TEST_PATTERNS.md#e2e)

## Installation

```bash
pnpm add -D @wpkernel/e2e-utils @playwright/test
```

Provide WordPress credentials via the standard Playwright configuration (the showcase app uses
`pnpm playground:offline` to spin up a zero-network environment).

## Quick start

```ts
import { test, expect } from '@wpkernel/e2e-utils';

test('admin can publish a job', async ({ page, admin, kernel }) => {
	await admin.login();

	const job = kernel.resource({ name: 'job' });
	await job.seed({ title: 'Software Engineer' });

	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	const dataview = kernel.dataview({ resource: 'job' });
	await dataview.waitForLoaded();
	await dataview.search('Engineer');

	const events = await kernel.events({ pattern: /^wpk\.job\./ });
	await dataview.runBulkAction('Publish');

	await expect(page.getByText('Software Engineer')).toBeVisible();
	expect(events.list()).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ type: 'job.published' }),
		])
	);
});
```

## Fixture catalogue

- **`test` / `expect`** – re-export Playwright with kernel fixtures registered.
- **Auth & roles** – `admin`, `user`, and session helpers layered on top of WordPress’ Playwright utils.
- **Database helpers** – `db.seed*`, `db.cleanup` for preparing users, posts, terms, and custom tables.
- **Kernel stores** – `kernel.store()` waits for resource state and inspects cache keys.
- **Resource helpers** – `kernel.resource()` seeds REST resources and queues cleanup.
- **Events** – `kernel.events()` records bus emissions for assertions.
- **DataView helpers** – `kernel.dataview()` drives `ResourceDataView` screens via the stable
  `data-wpk-dataview-*` attributes emitted by `@wpkernel/ui`.
- **Workspace utilities** – `withIsolatedWorkspace`, `collectManifestState`, and `runNodeSnippet`
  share filesystem scaffolds with CLI integration suites.

Import patterns are flexible: scoped (`@wpkernel/e2e-utils/auth`), namespaced (`import { auth } from …`),
or flat (`import { login } from …`). Choose one style per suite to keep fixtures discoverable.

## Validation strategy

Utilities are validated through the showcase application’s E2E suites and regression tests in this
package. When fixtures change, update the showcase scenarios or add targeted Playwright coverage to
prove the new behaviour works against a live WordPress instance.

## Requirements

- WordPress 6.7+
- Playwright 1.45+
- Node.js 20+
- `@wpkernel/core` runtime for kernel-aware fixtures

## Contributing

Describe new fixtures in the package guide and add coverage in either the showcase app or the local
Playwright suites under `packages/e2e-utils/src`. Prefer expanding shared factories over introducing
package-specific helpers so downstream projects benefit from the additions.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
