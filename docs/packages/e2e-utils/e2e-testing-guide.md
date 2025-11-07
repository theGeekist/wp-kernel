# @wpkernel/e2e-utils Playwright Guide

## Overview

`@wpkernel/e2e-utils` extends the WordPress Playwright fixtures with kernel-aware helpers for resources, stores, events, and workspace orchestration. Use it to exercise admin screens, ensure DataViews interactions remain accessible, and capture diagnostics from kernel pipelines.

## Workflow

Import the extended `test` fixture, declare kernel resources, and drive WordPress admin pages through the provided fixtures. Kernel helpers can seed REST resources, wait for store updates, and record events so suites assert both UI behaviour and underlying state transitions.

## Examples

```ts
import { test, expect } from '@wpkernel/e2e-utils';

test('job workflow', async ({ admin, kernel, page }) => {
  await admin.visitAdminPage('admin.php', 'page=my-plugin-jobs');

  const job = kernel.resource({ name: 'job', routes: {...} });
  await job.seed({ title: 'Engineer' });

  const jobStore = kernel.store('my-plugin/job');
  await jobStore.wait((state) => state.getList());

  await expect(page.getByText('Engineer')).toBeVisible();
});
```

## Patterns

Keep selectors anchored to the `data-wpk-dataview-*` attributes emitted by UI components to avoid brittle DOM lookups. Use kernel event helpers to confirm background jobs or notices fire when actions succeed, and clean up seeded data in `afterEach` hooks via the resource helper `deleteAll()`.

## Extension Points

Extend the kernel fixture by contributing new helper factories inside `createWPKernelUtils()`. Each helper can return domain-specific utilities that build on the resource, store, or event helpers exposed today. Thread additional diagnostics through the fixture so failure logs surface alongside Playwright traces.

## Testing

The package ships unit and integration suites under `packages/e2e-utils/src/__tests__`. When adding helpers, extend these suites to cover factory wiring, event capture, and workspace lifecycle to ensure Playwright fixtures remain deterministic.

## Cross-links

Coordinate with the UI testing cookbook when capturing DataView selectors, and reference the CLI plugin guide for workspace preparation steps that mirror the integration runners. The php-json-ast codemod plan explains how codemod diagnostics appear in `.wpk/` manifests that Playwright assertions can inspect.
