# @wpkernel/cli

## Unreleased

### Added

- **Transient fixtures** – The generate command golden captures transient storage metadata, TTL helper output, and cache invalidation context beside existing resources.

### Documentation

- **Transient parity docs** – Migration plan, AST tracker, and adapter brief now record shipped transient builders/tests and the ongoing fixture/doc refresh in Task 13.

## 0.5.0 - 2025-10-26

### Added

- **wp-option controllers (AST)** – `packages/cli/src/next/builders/php/resource/wpOption/**` now emit wp-option controllers through the next-generation pipeline, replacing the legacy string printer while preserving helper-first behaviour.

### Changed

- **Integration coverage** – The generate integration suite and controller snapshots include DemoOption fixtures so resource routing, method dispatch, and writer output stay covered end to end.

### Documentation

- **Phase 1 closure** – MVP plan, migration phases, and parity trackers mark Tasks 8 and 9 as shipped, document the unused buffer hotfix slot, and advance the CLI roadmap to the v0.5.x release track.

### Maintenance

- **Release prep** – No buffer hotfixes were required; the package version is bumped to `0.5.0` alongside the rest of the monorepo.

## 0.4.0

### Added

- **Phase 2C Storage Modes**: wp-taxonomy, wp-option, and transient storage implementations
    - `wp-taxonomy`: Full term CRUD via `get_terms()`, `wp_insert_term()`, `wp_update_term()`, `wp_delete_term()`
    - `wp-option`: Key-value storage via `get_option()`, `add_option()`, `update_option()`, `delete_option()` (returns 501 for list operations)
    - `transient`: TTL-aware storage via `get_transient()`, `set_transient()`, `delete_transient()` (returns 501 for list operations)
    - All modes follow composable pattern with proper identity resolution and permission defaults
- **PHP Printer Refactor**: Decomposed monolithic 1,236-line wp-post generator into composable architecture
    - Modular `wp-post/` directory (17 files) with focused generators for each CRUD operation
    - Shared utilities: REST args builder, route classification, template engine, value renderer, docblock generator
    - Main orchestrator reduced from 775 lines to 83 lines
    - Saves ~1,750 lines across Phase 2C by reusing infrastructure (~36% reduction)
    - Established pattern for future storage mode additions
- **ESLint Plugin**: 4 kernel config validation rules (`@kernel/config-consistency`, `@kernel/cache-keys-valid`, `@kernel/policy-hints`, `@kernel/doc-links`)
    - Educational error messages explaining framework contracts, runtime behavior, and concrete fixes
    - Inline documentation above each rule enforcement explaining the "why" behind constraints
    - JSDoc with @typedef for complex parameter objects and exported utilities
- `createPhpBuilder` now exposes driver overrides (PHP binary, bridge path, or `import.meta.url`) and `createPhpProgramWriterHelper` forwards them to `@wpkernel/php-driver`, with documentation covering the new configuration surface.
- IR inference for route transport classification (`local` vs `remote`)
- Identity field inference from route placeholders (`:id`, `:slug`, `:uuid`)
- Schema default to `'auto'` when storage exists but schema undefined
- Inferred `storage.postType` for `wp-post` resources
- Workspace-aware block discovery with SSR detection
- Warning system for route transport mismatches and naming collisions

### Changed

- CLI build now runs the PHP driver installer during Vite bundling so `nikic/php-parser` is available for integration tests and runtime tooling
- **Major PHP Printer Refactor**: Transformed monolithic architecture into composable generators
    - `wp-post.ts` (1,236 lines) → modular `wp-post/` directory (17 focused modules)
    - Main printer orchestrator reduced from 775 lines to 83 lines
    - Extracted shared utilities for REST args, routes, templates, builders, and value rendering
    - Enables clean addition of new storage modes without code duplication
    - Comprehensive test suite reorganized into focused spec files (basic, identity, meta, routes, stubs)
- Enhanced ESLint rule messages to explain: (1) what we inferred, (2) why the framework cares, (3) runtime consequences, (4) how to fix with examples
- Refactored monolithic `build-ir.ts` into focused modules (schema, routes, resource-builder, block-discovery, cache-keys, policies, php, ordering, canonical)
- Split IR test suite into focused spec files (core, defaults, validation, blocks, php)
- Externalised runtime-only dependencies (`chokidar`, `clipanion`, `cosmiconfig`,
  `typanion`) from the Vite build and lazy-loaded filesystem watching so the CLI
  bundle matches peer dependency expectations.

### Previous Changes

- Version bump to align with monorepo
- DataViews Phase 4: CLI now validates `ui.admin.dataviews` metadata and emits
  generated React screens, fixtures, and optional menu stubs under
  `.generated/` for resources declaring DataViews defaults.

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
