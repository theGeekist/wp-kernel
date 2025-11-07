# @wpkernel/test-utils Testing Cookbook

## Overview

`@wpkernel/test-utils` provides WordPress harnesses, kernel runtimes, and workspace helpers so plugin and framework tests can run against deterministic fixtures. The cookbook demonstrates how to compose harnesses for UI components, CLI workflows, and integration suites.

## Workflow

Create a WordPress harness, bootstrap the kernel UI provider, and then render components or execute CLI helpers under test. Integration suites share workspace helpers that manage temporary directories and composer fixtures so end-to-end flows stay reproducible.

## Examples

```ts
import { createWordPressTestHarness } from '@wpkernel/test-utils/core/wp-harness';
import { createWPKernelUITestHarness } from '@wpkernel/test-utils/ui';

const wordpress = createWordPressTestHarness();
const { renderWithKernel } = createWPKernelUITestHarness({
        provider: wordpress.createProvider(),
});

const screen = renderWithKernel(<JobsList />);
```

## Patterns

Always seed WordPress globals through the harness instead of mocking `window.wp` directly. Wrap UI renders with `createWPKernelUITestHarness()` so registry resets and console guards stay consistent across suites. For CLI tests, reuse the memory stream helpers to capture command output without touching stdout.

## Extension Points

Extend the harness by adding helpers under `packages/test-utils/src/**/test-support`. Follow the `.test-support.ts` suffix so the TypeScript tests project validates the helper, and expose new utilities through `packages/test-utils/src/index.ts` for downstream packages.

## Testing

Run `pnpm --filter @wpkernel/test-utils test` after modifying harness code. The suite covers WordPress data mocks, UI harness behaviour, CLI utilities, and integration workspace helpers, ensuring new helpers remain safe to consume across packages.

## Cross-links

Pair this cookbook with the UI plugin and framework guides to understand how harnesses wrap generated controllers. The CLI plugin guide demonstrates how integration helpers drive `runWpk()` workflows, while the e2e-utils guide explains how Playwright fixtures build on the same workspace primitives.
