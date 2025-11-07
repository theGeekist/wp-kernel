# @wpkernel/test-utils

Shared testing utilities for the WP Kernel monorepo. Harnesses in this package keep WordPress
globals, wpk runtime state, and workspace scaffolds deterministic across unit, integration,
and CLI suites.

## Overview

The helpers are grouped by concern so packages can compose only what they need:

- **WordPress harness** – create deterministic `window.wp` globals, fixtures, and `apiFetch`
  mocks for unit tests.
- **Action runtime** – override `__WP_KERNEL_ACTION_RUNTIME__` safely when exercising actions.
- **UI harness** – bootstrap `WPKernelUIProvider` with console guards and registry resets.
- **CLI helpers** – memory streams, command contexts, reporter mocks, and async flush helpers.
- **Integration utilities** – disposable workspaces, PHP bridge runners, and filesystem diffing.

## Quick links

- [Package guide](../../docs/packages/test-utils.md)
- [Testing patterns](../../tests/TEST_PATTERNS.md)
- [API reference](../../docs/api/@wpkernel/test-utils/README.md)

## Installation

```bash
pnpm add -D @wpkernel/test-utils
```

These helpers are published for internal use while the MVP stabilises. Import the families you
need rather than deep-linking into source files so future refactors remain non-breaking.

## Quick start

```ts
import { createWPKernelUITestHarness } from '@wpkernel/test-utils/ui';
import { createWordPressTestHarness } from '@wpkernel/test-utils/core/wp-harness';

const wp = createWordPressTestHarness();
const { renderWithKernel } = createWPKernelUITestHarness({
        createRuntime: () => wp.wpkernelRuntime,
});

it('renders job list', async () => {
        const screen = renderWithKernel(<JobsList />);
        await screen.findByText('Software Engineer');
});
```

## Harness catalogue

### WordPress harness

- `createWordPressTestHarness` – seeds deterministic stores, selectors, and hooks.
- `withWordPressData` / `createApiFetchHarness` – scope mutations around tests to avoid global
  leakage.

### Action runtime helpers

- `applyActionRuntimeOverrides` / `withActionRuntimeOverrides` – mutate the global runtime
  safely and roll back between assertions.

### UI harness

- `createWPKernelUITestHarness` – wraps `WPKernelUIProvider` with console guards, registry
  resets, and helper assertions.
- DataView utilities live in `src/ui/kernel-ui-harness.ts` and
  `src/dataviews/test-support/ResourceDataView.test-support.tsx`; extend them when new shared
  flows are required and add accompanying self-tests.

### CLI helpers

- `MemoryStream`, `createCommandContext`, `createReporterMock`, and `flushAsync` – share the
  canonical Clipanion wiring used by CLI suites.

### Integration utilities

- `withWorkspace`, `createWorkspaceRunner`, and PHP helpers under `src/integration/` – create
  disposable workspaces, execute PHP drivers, and compare manifests without hand-rolled file IO.

## Validation

Run `pnpm --filter @wpkernel/test-utils test` and `pnpm --filter @wpkernel/test-utils typecheck:tests`
after changing harnesses. Consumers should also re-run their suites to confirm shared helpers did
not regress behaviour.

## Contributing

Keep new helpers exported through `src/index.ts` and update the package guide when surfaces move
between families. Document novel patterns in `tests/TEST_PATTERNS.md` so downstream packages adopt
the same conventions.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
