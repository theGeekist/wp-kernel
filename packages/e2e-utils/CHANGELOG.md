# @wpkernel/e2e-utils

## Unreleased

### In progress

- **Phase 6 – Core pipeline alignment** – Pending CLI/core updates may require
  refreshed fixtures; track Tasks 32-36 in the MVP ledger to mirror any runtime
  adjustments once they merge.
- **Phase 7 – Plugin bootstrap flow** – Tasks 37-45 cover the create bootstrap, plugin loader, regeneration cleanup, and activation smoke before the 0.11.0 release; note any required Playwright harness updates once those patches land.
- **Phase 8 placeholder** – Task 46 will collect incremental diagnostics (starting with the CLI LogLayer reporter) after the bootstrap flow ships.

## 0.9.0 - 2025-10-27

### Maintenance

- Version bump to `0.9.0` to align with the Phase 5 release; existing Playwright
  fixtures continue to exercise the layered apply workflow without additional
  changes.

### Documentation

- Updated release notes to confirm the E2E suite validates the Task 31 apply
  checklist alongside the CLI release.

## 0.8.0 - 2025-10-26

### Maintenance

- Version bump to `0.8.0` to stay in lockstep with the command migration
  release; fixture APIs are unchanged and continue to proxy CLI behaviour for the
  new command factories.

## 0.7.0 - 2025-10-26

### Maintenance

- Version bump to `0.7.0` to stay aligned with the Phase 3 release; no additional E2E utility changes shipped in this cycle.

## 0.6.0 - 2025-10-26

### Maintenance

- Version bump to `0.6.0` to stay aligned with the Phase 2 release; no additional E2E utility changes shipped in this cycle.

## 0.5.0 - 2025-10-26

### Maintenance

- Version bump to `0.5.0` to stay aligned with the Phase 1 release; no additional E2E utility changes shipped in this cycle.

## 0.4.0

### Changes

- Version bump to align with monorepo
- **DataViews Phase 5**: Enhanced E2E utilities for kernel resource testing
    - `createKernelUtils()` provides resource, store, and event testing helpers
    - Resource utilities: `seed()`, `seedMany()`, `remove()`, `deleteAll()` for test data management
    - Store utilities for WordPress Data registry interactions
    - Event utilities for kernel event bus testing
    - Comprehensive unit tests validating utility functions
- Updated kernel imports to consume the new resource cache barrels, keeping
  the utilities aligned with the public package exports.

## 0.2.0

### Patch Changes

- Internal monorepo improvements
- Updated dependencies
    - @wpkernel/core@0.2.0

### Added (from previous unreleased)

### Added

- **Core Factory Implementation**: Complete E2E testing utilities following WordPress patterns
    - `createKernelUtils()` factory with resource, store, and event utilities
    - Extended test fixture with `kernel` fixture pre-configured
    - Primary usage: `import { test, expect } from '@wpkernel/e2e-utils'`
    - Advanced usage: `import { createKernelUtils }` for custom fixture setup
- **Resource Utilities**: REST API testing helpers
    - `seed()` - Create single resource via REST
    - `seedMany()` - Batch create resources
    - `remove()` - Delete single resource by ID
    - `deleteAll()` - Clean up all test data
- **Store Utilities**: @wordpress/data store testing
    - `wait()` - Wait for store selector to resolve
    - `invalidate()` - Force store cache invalidation
    - `getState()` - Get current store state snapshot
- **Event Utilities**: JS hooks event tracking
    - `start()` - Begin recording events
    - `stop()` - Stop recording and cleanup
    - `list()` - Get all captured events
    - `find()` - Find first matching event
    - `findAll()` - Find all matching events
    - `clear()` - Clear event history
- **Documentation**:
    - `MIGRATION.md` - Guide for migrating from vanilla Playwright
    - `IMPLEMENTATION.md` - Architecture decisions and patterns

### Technical Details

- Single consolidated factory (not separate modules)
- Extends `@wordpress/e2e-test-utils-playwright` with kernel fixture
- Dependency injection pattern for fixtures
- Full TypeScript support with generics (`T = unknown`)
- Follows WordPress E2E utils export pattern

## 1.0.0

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

    **WordPress Integration**:
    - wp-env configuration (WordPress 6.8 + PHP 8.3)
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
