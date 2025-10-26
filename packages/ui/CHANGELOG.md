# @wpkernel/ui

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` to match the Phase 1 release; UI packages pick up the new version without functional changes in this cycle.

## 0.4.0

### Major Changes

- Introduced `attachUIBindings`, `KernelUIProvider`, and runtime context so hooks
  consume configuration explicitly instead of relying on global side effects.
- **DataViews Phase 2**: Added `ResourceDataView` component with resource/action controllers
    - `createResourceDataViewController` for DataViews state → resource query mapping
    - `createDataFormController` for DataForm → kernel action integration with cache invalidation
    - `ResourceDataView` React component bridging kernel resources/actions with WordPress DataViews UI
    - Policy-gated actions with error normalization
    - Comprehensive test fixtures for DataViews integration (`packages/ui/fixtures/dataviews/`)
- **DataViews Phase 3**: `configureKernel` auto-registers resource DataViews configs, wiring runtime events and integration
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
  and replays the kernel registry instead of mutating globals, so UI bundles can
  subscribe deterministically regardless of load order.
- Hooks such as `useAction`, `useResourceList`, and prefetch helpers now throw a
  `KernelError` if a `KernelUIRuntime` is not available.

### Bug Fixes

- Fixed policy runtime freezing at UI attachment time. `runtime.policies` is now
  a getter that dynamically resolves from the global policy runtime, allowing
  policies registered via `definePolicy()` after `attachUIBindings()` to be
  observed (e.g., lazy-loaded plugins). Components won't auto-rerender on late
  registration but will observe new policies on their next render triggered by
  other state changes.
- Auto-registered `ResourceDataView` controllers now re-resolve policy runtime
  accessors so that actions gated by policies unlock once `definePolicy()`
  registers the runtime, avoiding the need for a full refresh when the UI
  attached before policies were available.
- Migrated all kernel imports to the new `@wpkernel/core/events` and
  `@wpkernel/core/resource/*` barrels so UI bundles no longer rely on the
  package root.

### Migration Guide

```tsx
import { configureKernel } from '@wpkernel/core';
import { attachUIBindings, KernelUIProvider } from '@wpkernel/ui';

const kernel = configureKernel({
	namespace: 'my-plugin',
	registry: window.wp.data,
	ui: { attach: attachUIBindings },
});

const runtime = kernel.getUIRuntime();

createRoot(node).render(
	<KernelUIProvider runtime={runtime}>
		<App />
	</KernelUIProvider>
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
  highlighting `KernelUIProvider`, runtime attachment, and the absence of legacy
  globals so integrators follow the final architecture.

## 0.2.0

### Patch Changes

- Internal monorepo improvements
- Updated dependencies
    - @wpkernel/core@0.2.0

## 0.1.0

### Minor Changes

- Sprint 0 foundation release

    This is the initial release establishing the complete development environment and tooling infrastructure for the WP Kernel framework.

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

    **WordPress Integration**: - Error tests (KernelError, ServerError, TransportError)
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

    Complete development environment, tooling, and CI/CD pipeline for WP Kernel framework.

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
