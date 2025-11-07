# @wpkernel/ui

## Unreleased

### Patch 0.11.1 - Task 46: DataViews schema expansion

- Auto-register saved views, default layouts, and menu metadata inside `attachUIBindings()` so wpk resources hydrate `ResourceDataView` controllers without bespoke wiring. Runtime tests cover the expanded schema and the README now documents the new `screen.menu` capabilities.

### Patch 0.11.2 - Task 47: Async boundaries & notices

- `ResourceDataView` renders shared loading, empty, error, and permission-denied boundaries using the controller reporter and capability runtime, while `useDataViewActions()` dispatches success/error notices through the WordPress registry and logs outcomes via the controller reporter.

## 0.11.0 - 2025-11-04

### Maintenance

- Version bump to `0.11.0` to align with the Phase 7 plugin bootstrap flow release; no UI runtime changes were required for this cycle.

## 0.10.0 - 2025-11-05

### Maintenance

- Version bump to `0.10.0` to stay aligned with the Phase 6 core pipeline release; no UI runtime changes were required for this cycle.

## 0.9.0 - 2025-10-27

### Maintenance

- Version bump to `0.9.0` to remain aligned with the Phase 5 release; UI exports
  continue to mirror the runtime without further adjustments.

## 0.8.0 - 2025-10-26

### Maintenance

- Version bump to `0.8.0` alongside the command migration release; UI APIs are
  unchanged apart from the `VERSION` constant update.

## 0.7.0 - 2025-10-26

### Maintenance

- Version bump to `0.7.0` to align with the Phase 3 block builder release; UI exports are unchanged aside from the `VERSION` constant update.

## 0.6.0 - 2025-10-26

### Maintenance

- Version bump to `0.6.0` to match the Phase 2 release; no additional UI changes shipped in this cycle.

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` to match the Phase 1 release; UI packages pick up the new version without functional changes in this cycle.

## 0.4.0

### Major Changes

- Introduced `attachUIBindings`, `WPKernelUIProvider`, and runtime context so hooks
  consume configuration explicitly instead of relying on global side effects.
- **DataViews Phase 2**: Added `ResourceDataView` component with resource/action controllers
    - `createResourceDataViewController` for DataViews state → resource query mapping
    - `createDataFormController` for DataForm → wpk action integration with cache invalidation
    - `ResourceDataView` React component bridging wpk resources/actions with WordPress DataViews UI
    - Capability-gated actions with error normalization
    - Comprehensive test fixtures for DataViews integration (`packages/ui/fixtures/dataviews/`)
- **DataViews Phase 3**: `configureWPKernel` auto-registers resource DataViews configs, wiring runtime events and integration
  tests across kernel/UI packages.
- **DataViews Phase 5**: Complete documentation, showcase integration, and E2E utilities
    - Comprehensive DataViews guide (`docs/guide/dataviews.md`) with setup, usage patterns, and migration notes
    - Showcase app JobsList migrated to `ResourceDataView` demonstrating real-world usage
    - Enhanced `ResourceDataView` with better error handling and loading states
    - Updated UI package docs with DataViews API reference and examples

### Breaking Changes

- Removed the legacy global queue (`__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__` /
  `__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__`). Importing
  `@wpkernel/ui` no longer auto-attaches hooks.
- Resource hook attachment now listens to `kernel.events` (`resource:defined`)
  and replays the wpk registry instead of mutating globals, so UI bundles can
  subscribe deterministically regardless of load order.
- Hooks such as `useAction`, `useResourceList`, and prefetch helpers now throw a
  `WPKernelError` if a `WPKernelUIRuntime` is not available.

### Bug Fixes

- Fixed capability runtime freezing at UI attachment time. `runtime.capabilities` is now
  a getter that dynamically resolves from the global capability runtime, allowing
  capabilities registered via `defineCapability()` after `attachUIBindings()` to be
  observed (e.g., lazy-loaded plugins). Components won't auto-rerender on late
  registration but will observe new capabilities on their next render triggered by
  other state changes.
- Auto-registered `ResourceDataView` controllers now re-resolve capability runtime
  accessors so that actions gated by capabilities unlock once `defineCapability()`
  registers the runtime, avoiding the need for a full refresh when the UI
  attached before capabilities were available.
- Migrated all wpk imports to the new `@wpkernel/core/events` and
  `@wpkernel/core/resource/*` barrels so UI bundles no longer rely on the
  package root.

### Migration Guide

```tsx
import { configureWPKernel } from '@wpkernel/core';
import { attachUIBindings, WPKernelUIProvider } from '@wpkernel/ui';

const wpk = configureWPKernel({
	namespace: 'my-plugin',
	registry: window.wp.data,
	ui: { attach: attachUIBindings },
});

const runtime = kernel.getUIRuntime();

createRoot(node).render(
	<WPKernelUIProvider runtime={runtime}>
		<App />
	</WPKernelUIProvider>
);
```

### Technical Details

- `useAction` now resolves its dispatcher directly from the WordPress data
  registry on demand-no global caching on `window`.
- Resource hooks attach via the runtime’s `attachResourceHooks()` callback when
  the adapter is provided.
- Refactored `ResourceDataView` into focused hooks/utilities with shared test
  helpers, reducing file size and improving maintainability for DataViews
  integrations.
- TypeScript strict mode with full type safety

### Documentation

- Recorded the adapter-only runtime baseline across the documentation site,
  highlighting `WPKernelUIProvider`, runtime attachment, and the absence of legacy
  globals so integrators follow the final architecture.

## 0.2.0

### Patch Changes

- Internal monorepo improvements
- Updated dependencies
    - @wpkernel/core@0.2.0

## 0.1.0

### Minor Changes

- Sprint 0 foundation release

    This is the initial release establishing the complete development environment and tooling infrastructure for the WPKernel framework.

    **Monorepo Structure**:
    - pnpm workspaces with 4 packages (kernel, ui, cli, e2e-utils)
    - TypeScript 5.9.2 strict mode with composite builds
    - Path aliases configured (@wpkernel/\*)

    **Build & Tooling**:
    - ESLint 9.36.0 flat config (zero deprecated dependencies)
    - Prettier integration with WordPress code style
    - Zero peer dependency warnings (React 18 enforced)
    - Split builds: `build:packages` / `build:examples`
    - Parallel watch mode with `pnpm dev`

    **Developer Experience**:
    - VS Code workspace with 25+ tasks for all workflows
    - Debug configurations (Jest, CLI)
    - Format on save + ESLint auto-fix
    - 30+ validated pnpm scripts
    - Comprehensive documentation (SCRIPTS.md, SCRIPTS_AUDIT.md)

    **WordPress Integration**: - Error tests (WPKernelError, ServerError, TransportError)
    - Resources with cache invalidation + auto-retry
    - wp-env configuration (WordPress 6.8 + PHP 8.3)
    - Changesets for version management
    - Dev environment (:8888) and tests environment (:8889)
    - Script Modules API integration verified
    - Showcase plugin demonstrating Script Module registration (857 bytes minified)
    - `pnpm wp:*` commands for all WordPress workflows

    **Package Contents**:
    - **@wpkernel/core**: Core framework APIs (placeholder structure)
    - **@wpkernel/ui**: UI components (placeholder structure)
    - **@wpkernel/cli**: Code generator CLI (placeholder structure)
    - **@wpkernel/e2e-utils**: E2E testing utilities (placeholder structure)

    **Known Limitations**:
    - API implementations are placeholder structures only
    - No actual Resource, Action, or Event functionality yet
    - Documentation is incomplete (CONTRIBUTING, TESTING, RUNBOOK pending)
    - CI/CD pipeline not configured
    - Seed scripts infrastructure exists but scripts incomplete

    **What's Next** (Sprint 1):
    - Resource API implementation
    - Type generation from JSON Schema
    - @wordpress/data store integration
    - First Action with event emission
    - Cache invalidation helpers

- # Sprint 0 Complete - Foundation Release

    Complete development environment, tooling, and CI/CD pipeline for WPKernel framework.

    ## Infrastructure ✓
    - **Monorepo**: pnpm workspaces with 5 packages (kernel, ui, cli, e2e-utils, showcase-plugin)
    - **TypeScript**: Strict mode, project references, path aliases
    - **Build**: Webpack + @wordpress/scripts, watch mode
    - **Lint**: ESLint 9 flat config, Prettier, deep-import rules
    - **Changesets**: Semantic versioning with automated releases

    ## Development Environment ✓
    - **wp-env**: WordPress 6.8+ with PHP 8.3, dual environments (dev:8888, test:8889)
    - **WordPress Playground**: WASM environment for quick demos
    - **Seed Scripts**: Idempotent fixtures (users, applications, jobs, media)
    - **Script Modules**: ESM support verified in WordPress 6.8

    ## Testing ✓
    - **Jest**: Unit tests with @wordpress/jest-preset-default (4 tests passing, 25% coverage)
    - **Playwright**: E2E tests with @wordpress/e2e-test-utils-playwright (5 tests, 3 browsers)
    - **CI**: GitHub Actions with optimized caching, all jobs passing

    ## Documentation ✓
    - **VitePress Site**: https://theGeekist.github.io/wp-kernel/
    - **24 Pages**: Getting Started, Core Concepts, Contributing, Runbook, Standards, Testing
    - **Auto-Deploy**: GitHub Actions workflow for gh-pages
    - **Templates**: PR template, contributor license (EUPL-1.2)

    ## Developer Experience ✓
    - **VS Code**: 25+ tasks, debug configs, recommended extensions
    - **30+ Scripts**: dev, build, test, wp:fresh, e2e, playground, changeset
    - **License**: EUPL-1.2 (copyleft with network clause)

    ## Quality Gates ✓
    - Zero deprecated dependencies
    - Zero peer dependency warnings
    - Zero ESLint errors
    - All builds successful
    - All tests passing
    - CI pipeline green

    Ready for Sprint 1: Resources + Actions + Events implementation.

### Patch Changes

- Updated dependencies
- Updated dependencies
    - @wpkernel/core@0.1.0
