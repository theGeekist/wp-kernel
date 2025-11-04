# @wpkernel/core

## Unreleased

### In progress

- **Phase 8 placeholder** – Task 46 will collect incremental diagnostics (LogLayer reporter, transcript polish) after the bootstrap flow ships.

## 0.11.0 - 2025-11-04

### Maintenance

- Version bump to `0.11.0` to align with the Phase 7 plugin bootstrap flow release; the runtime surface is unchanged beyond the exported `VERSION` constant update.

## 0.10.0 - 2025-11-05

### Added

- Pipeline helpers now orchestrate `defineAction`, `defineResource`, and `defineInteraction` through the shared `create*` catalogue with reporter/rollback bindings.

### Changed

- Diagnostics warn on missing or unused helpers, helper modules honour the reserved `create*` prefix, and pipeline rollback hooks unwind side effects when orchestration fails.

### Documentation

- Recorded Phase 6 completion in the core pipeline spec and CLI docs, including guidance for the new interactivity bridge.

### Maintenance

- Version bump to `0.10.0` to align with the Phase 6 core pipeline release and update the exported `VERSION` constant.

## 0.9.0 - 2025-10-27

### Maintenance

- Version bump to `0.9.0` to align with the Phase 5 apply workflow release; the
  runtime surface is unchanged beyond the exported `VERSION` constant update.

### Documentation

- Mirrored the CLI MVP ledger by marking Task 31 as shipped and confirming the
  apply layering notes in the shared specs remain accurate for the runtime.

## 0.8.0 - 2025-10-26

### Maintenance

- Version bump to `0.8.0` so the core package stays aligned with the command
  migration release; runtime APIs remain unchanged aside from the `VERSION`
  constant.

### Documentation

- Confirmed the command migration documentation references the current core
  contracts and removed legacy command mentions from the runtime guides.

## 0.7.0 - 2025-10-26

### Maintenance

- Version bump to `0.7.0` to align with the Phase 3 block builder release; runtime code remains unchanged aside from the exported `VERSION` constant.

## 0.6.0 - 2025-10-26

### Maintenance

- Version bump to `0.6.0` to align with the Phase 2 release; runtime code remains unchanged aside from the exported `VERSION` constant.

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` to align with the Phase 1 release; runtime code is unchanged aside from the exported `VERSION` constant.

## 0.4.0

### Breaking Changes

- Removed the `withWPKernel()` export. Registry middleware is now wired directly
  through `configureWPKernel()`, and teardown happens via the returned instance.
- `defineAction()` and `defineCapability()` now accept configuration objects
  (`{ name, handler, options }` / `{ map, options }`) rather than positional
  parameters. Update call sites to pass the new shape.

### Minor Changes

- Introduced `wpk.attachUIBindings()`, `wpk.getUIRuntime()`, and
  `wpk.hasUIRuntime()` to manage UI adapters without global mutation.
- `defineResource()` now registers resources with the runtime via
  `trackUIResource()` instead of relying on queued globals.
- Added `WPKernelEventBus` with `wpk.events` so lifecycle events surface through
  a typed subscription interface while continuing to bridge into `wp.hooks`.
  Action and cache events now emit through the bus, enabling UI runtimes and
  adapters to subscribe without global shims.
- Published a dedicated `@wpkernel/core/events` barrel export so consumers
  can rely on the event bus without importing from the package root.
- Resource reporters inherit from the WP Kernel instance. Client methods and store
  resolvers emit structured `debug`/`info`/`error` logs and every resource now
  exposes a `reporter` property for custom instrumentation.
- **DataViews Phase 3**: `configureWPKernel` preserves resource UI metadata,
  forwards DataViews options to UI attachments, and emits `ui:dataviews:*`
  events end-to-end with new integration coverage.
- **DataViews Phase 4**: `ResourceConfig`/`ResourceObject` expose typed
  `ui.admin.dataviews` metadata (screen + menu), keeping CLI/WP Kernel parity for
  declarative DataViews scaffolding.
- Cache invalidation helpers and the transport layer accept reporter metadata,
  emitting `cache.invalidate.*` and `transport.*` events with WP Kernel-scoped
  defaults so cache/REST lifecycles share correlation IDs.

### Technical Details

- UI runtime state lives in `data/ui-runtime.ts`, flushing pending resources when
  adapters attach.
- `resource/define.ts` calls `trackUIResource()` so hooks attach immediately once
  a runtime is available.

### Documentation

- Finalized Phase 7 by aligning the root specifications, README, roadmap, and
  `/docs` guides with the adapter-driven runtime, typed event bus, and
  configuration-object APIs. Examples now showcase `configureWPKernel()`,
  `WPKernelUIProvider`, and cache/event orchestration through action context.

## 0.3.0

### Patch Changes

- Internal monorepo improvements

## 0.1.0

### Minor Changes

- Sprint 0 foundation release

    This is the initial release establishing the complete development environment and tooling infrastructure for the WP Kernel framework.

    **Monorepo Structure**:
    - pnpm workspaces with 4 packages (wp-kernel, ui, cli, e2e-utils)
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

    **WordPress Integration**:
    - Error tests (WPKernelError, ServerError, TransportError)
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
    - **Monorepo**: pnpm workspaces with 5 packages (wp-kernel, ui, cli, e2e-utils, showcase-plugin)
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
