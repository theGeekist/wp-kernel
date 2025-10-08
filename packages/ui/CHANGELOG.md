# @geekist/wp-kernel-ui

## 0.3.0 [Unreleased]

### Major Changes

- Introduced `attachUIBindings`, `KernelUIProvider`, and runtime context so hooks
  consume configuration explicitly instead of relying on global side effects.

### Breaking Changes

- Removed the legacy global queue (`__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__` /
  `__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__`). Importing
  `@geekist/wp-kernel-ui` no longer auto-attaches hooks.
- Hooks such as `useAction`, `useResourceList`, and prefetch helpers now throw a
  `KernelError` if a `KernelUIRuntime` is not available.

### Migration Guide

```tsx
import { configureKernel } from '@geekist/wp-kernel';
import { attachUIBindings, KernelUIProvider } from '@geekist/wp-kernel-ui';

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

- `useAction` now resolves its dispatcher from the runtime using a cached
  factory (no more globals on `window`).
- Resource hooks attach via the runtime’s `attachResourceHooks()` callback when
  the adapter is provided.
- TypeScript strict mode with full type safety

## 0.2.0

### Patch Changes

- Internal monorepo improvements
- Updated dependencies
    - @geekist/wp-kernel@0.2.0

## 0.1.0

### Minor Changes

- Sprint 0 foundation release

    This is the initial release establishing the complete development environment and tooling infrastructure for the WP Kernel framework.

    **Monorepo Structure**:
    - pnpm workspaces with 4 packages (kernel, ui, cli, e2e-utils)
    - TypeScript 5.9.2 strict mode with composite builds
    - Path aliases configured (@geekist/\*)

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
    - **@geekist/wp-kernel**: Core framework APIs (placeholder structure)
    - **@geekist/wp-kernel-ui**: UI components (placeholder structure)
    - **@geekist/wp-kernel-cli**: Code generator CLI (placeholder structure)
    - **@geekist/wp-kernel-e2e-utils**: E2E testing utilities (placeholder structure)

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
    - @geekist/wp-kernel@0.1.0
