# Changelog

All notable changes to the WP Kernel project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- **Test execution** - All Jest test runs now fail fast on first error by default (`bail: 1`), significantly reducing test execution time when failures occur. Improves feedback loop for developers working with >2.1k tests. Can be overridden with `--no-bail` or `--maxFailures=N` flags. Watch mode automatically disables bail to allow continuous testing.

### Fixed

- **Core package exports** - Fixed missing Vite build entry points for `namespace` and `events` submodules, ensuring `@wpkernel/core/namespace` and `@wpkernel/core/events` imports work correctly at runtime. Updated package.json export paths to match actual build output structure.

### Documentation

- **Import patterns** - Removed outdated namespace import pattern (`import { http } from '@wpkernel/core'`) from README and package documentation. Framework now documents two patterns: submodule imports (recommended for tree-shaking) and flat imports (convenient).

### In progress

- **Phase 8 placeholder** - Task 46 will collect incremental diagnostics (starting with the CLI LogLayer reporter) after the plugin bootstrap flow ships.

## [0.11.0] - 2025-11-04

### Added

- **Plugin bootstrap flow** - `npm create @wpkernel/wpk` now scaffolds a new plugin with a complete, activatable bootstrap loader, and `wpk init` safely adopts existing plugins without overwriting author-owned files.

### Fixed

- **Generation state diffs** - `wpk generate` now persists `.wpk/apply/state.json`, compares per-resource artefact paths between runs, prunes stale `.generated/**` files when PHP output or autoload roots change, and queues shim deletions in the apply plan so `wpk apply` removes obsolete loaders.

## [0.10.0] - 2025-11-05

### Added

- **Pipeline-only core orchestration** - Core now routes `defineAction`, `defineResource`, and interactivity helpers through the shared pipeline catalogue with new diagnostics and helper naming guarantees.
- **Interactivity bridge** - Published `defineInteraction` under `@wpkernel/core/interactivity`, wiring store actions to the pipeline-aware runtime and documenting installation expectations.

### Changed

- **Diagnostics polish** - Reporter integrations surface missing helper warnings, helper modules honour the reserved `create*` prefix, and rollback hooks unwind side effects when helpers fail.

### Documentation

- **Phase 6 closure** - Updated the CLI MVP ledger, migration phases brief, and core pipeline spec to record Task 32‑36 completion and the 0.10.0 release.

### Maintenance

- **Monorepo release** - Bumped all packages, showcase fixtures, and version trackers to `0.10.0` ahead of the Phase 6 minor release.

## [0.9.0] - 2025-10-27

### Added

- **Apply workflow release** - Cut the v0.9.0 release after validating the layered `wpk generate && wpk apply --yes --dry-run` flow and finishing the Task 31 checklist.

### Documentation

- **Task 31 closure** - Updated the CLI MVP ledger to mark the Phase 5 minor release as shipped and captured the apply workflow migration notes.

### Maintenance

- **Monorepo release** - Bumped all packages, showcase fixtures, and generated API docs to `0.9.0` via the release automation script.

## [0.8.0] - 2025-10-26

### Removed

- **Legacy CLI shims** - Deleted the string-based printers and Clipanion command classes, wiring the CLI entrypoint directly to the command factories.

### Changed

- **Command registration** - `wpk` now registers `generate`, `init`, `create`, `start`, `doctor`, and `apply` via the next pipeline builders only; the deprecated `build` command has been removed.

### Documentation

- **Phase 4 release** - Updated the CLI roadmap, quick start, resource guide, and showcase docs to reference the builder-based pipeline and mark Task 26 (0.8.0) as shipped.

### Maintenance

- **Monorepo release** - Bumped all packages, templates, and showcase fixtures to `0.8.0` and regenerated API/docs content after retiring the legacy printers.

## [0.7.0] - 2025-10-26

### Added

- **Block builder parity** - The pipeline now stages block manifests, registrars, and render stubs through shared helpers for both SSR and JS-only variants, matching the legacy printers without string-based generation.

### Fixed

- **Block manifest cache invalidation** - Workspace-aware file signatures refresh manifest and render metadata when source files change so builders no longer reuse stale cache entries.

### Documentation

- **Phase 3 completion** - CLI migration docs mark Tasks 16-19 as shipped, describe the shared `ts-morph` primitives, and call out the 0.7.0 release cadence.

### Maintenance

- **Monorepo release** - Bumped all packages, templates, and showcase fixtures to `0.7.0` and regenerated API docs for the release tag.

## [0.6.0] - 2025-10-26

### Added

- **Transient parity pipeline** - Completed the transient AST builders, routed DELETE handlers, and refreshed generated fixtures so transient resources now ship with cache metadata and TTL helpers.

### Fixed

- **Transient DELETE handlers** - DELETE routes now call `delete_transient()`, return cache invalidation payloads, and emit shared cache events instead of responding with `501` errors.

### Documentation

- **Phase 2 wrap-up** - CLI docs record Task 14 as shipped, log the 0.6.0 release, and open the Phase 3 patch band for block builders.

### Maintenance

- **Monorepo release** - Bumped all packages, showcase fixtures, and version trackers to `0.6.0` following the Phase 2 minor release checklist.

## [0.5.0] - 2025-10-26

### Added

- **wp-option AST parity** - The CLI pipeline now emits wp-option controllers, helpers, and routes as `PhpProgram` artefacts alongside existing post and taxonomy resources, replacing the legacy string-based printer.

### Changed

- **Integration coverage** - The shared PHP IR fixture, generate integration suite, and controller snapshots now capture DemoOption artefacts so regression tests exercise the option controller end to end.

### Documentation

- **Phase 1 tracking updates** - CLI migration docs mark Tasks 8 and 9 as shipped, note the unused hotfix buffer, and advance the roadmap to the 0.5.x train ahead of the Phase 1 minor release.

### Maintenance

- **Release prep** - No hotfixes were required during the buffer slot; all publishable packages and showcase examples now carry version `0.5.0` in preparation for the Phase 1 release.

## [0.4.0]

### Added - Sprint 5: React Hooks Integration

#### Breaking Changes

- **Moved and renamed `useKernel` → `withKernel`** - Bootstrap function moved from `@wpkernel/ui` to `@wpkernel/core`
    - Function renamed to better reflect its purpose (it's not a React hook)
    - Import from `@wpkernel/core` instead of `@wpkernel/ui`
    - All functionality remains the same

#### New Hooks (`@wpkernel/ui`)

- **`useAction()`** - Complete action dispatch system with WordPress data integration
    - 4 concurrency modes: `parallel`, `switch`, `queue`, `drop`
    - Automatic cache invalidation and deduplication
    - Cancellation support with proper queue handling
- **`useGet()` & `useList()`** - Resource data fetching hooks
    - Lazy attachment mechanism for resources defined before UI loads
    - WordPress data store integration
- **`useCapability()`** - Capability checks in UI (migrated from kernel package)
    - Reactive capability cache with `can()` helper
    - Loading and error states
- **Prefetching Hooks**:
    - `usePrefetcher()` - Generic prefetching orchestrator with debouncing
    - `useVisiblePrefetch()` - IntersectionObserver-based viewport prefetching
    - `useHoverPrefetch()` - Hover-triggered prefetching
    - `useNextPagePrefetch()` - Pagination-aware prefetching

#### Kernel Changes (`@wpkernel/core`)

- Emitted typed events from `defineResource()` so UI bindings attach deterministically without queues.
- Replayed registered resources through the kernel instance, allowing UI packages to hydrate hooks on demand.
- Removed the `__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__` global now that runtime events drive attachment.
- Added configurable resource store identifiers (`store.getId`, `store.getQueryKey`, `store.initialState`) with runtime
  validation and reporter diagnostics for duplicates or missing keys.
- Updated end-to-end helpers to respect slug and UUID identifiers when seeding or deleting fixtures.

### Fixed

- **P1: Resource Hook Timing** - Resources defined before UI loads can now bind React hooks when UI initializes
- **P1: Queue Cancellation** - Fixed queue concurrency mode to properly prevent cancelled actions from executing

### Changed

- Consolidated lifecycle phases, namespace constants, and CLI exit codes under `@wpkernel/core/contracts`, updating all packages, tooling, and docs to import from the shared contract, normalising error serialization, and restoring the canonical `WPK_*` contract names.
- Dropped the transitional `KERNEL_*` alias exports from the contracts barrel to keep the pre-release surface focused on the preferred WPK naming.

### Testing

- Added 28 new test cases across 9 test files
- Achieved 89.73% branch coverage (970 tests passing)
- Comprehensive coverage of all new hooks and edge cases

---

## [0.2.0] - 2025-10-06

### Changed

- Internal monorepo improvements

---

## [0.1.0] - 2025-10-06

### 🎉 Sprints 0-4.5 Complete: Production-Ready Core Framework

This release marks the completion of the foundation, resources, E2E utilities, capabilities, actions, WordPress data integration, and unified reporting systems. The framework is now production-ready for early adopters.

**Completed Sprints:**

- ✓ Sprint 0: Foundation & Monorepo Infrastructure
- ✓ Sprint 1: Resources & Stores (V1)
- ✓ Sprint 1.5: Build Tooling & Resources Refactor
- ✓ Sprint 2: E2E Utils (Kernel-Aware Test Harness)
- ✓ Sprint 3: Capabilities (Complete Implementation)
- ✓ Sprint 4: Actions & WordPress Data Integration
- ✓ Sprint 4.5: Unified Reporting & Data Consolidation

**Test Coverage:** 58+ test files, 900+ tests, ≥95% statements/lines, ≥98% functions

---

### Added - Sprint 4.5: Unified Reporting

#### Reporter System (`@wpkernel/core`)

- **`createReporter()`** - Pluggable transport system for logging and monitoring
- **Consolidated logging** - Single reporter interface used across all packages
- **Request/response tracking** - Automatic correlation IDs for debugging
- **Reporter context** - Per-request metadata and tags
- **Capability integration** - Capability events flow through reporter
- **Noop reporter** - Zero-overhead production mode
- **Development transport** - Console logging with grouping and color coding
- **Type safety** - Full TypeScript definitions for reporters and transports

#### Package Updates

- All packages now use unified reporter for logging
- HTTP transport includes request/response/error tracking
- Actions emit lifecycle events through reporter
- Capability system reports denied/granted checks
- Resource operations tracked with correlation IDs

---

### Added - Sprint 4: Actions & WordPress Data Integration

#### Actions System (`@wpkernel/core/actions`)

- **`defineAction()`** - Write-path orchestration with typed handlers
- **Action middleware** - `createActionMiddleware()` for @wordpress/data stores
- **`invokeAction()`** - Dispatch actions through store middleware
- **Lifecycle events** - `wpk.action.start`, `wpk.action.complete`, `wpk.action.error`
- **ActionContext runtime** - Helper methods: `ctx.emit()`, `ctx.invalidate()`, `ctx.jobs`
- **Error handling** - Structured error context and correlation
- **Cache invalidation** - Automatic coordination after mutations
- **Event emission** - Domain events (resource.events.created/updated/removed)
- **Job integration** - Background work queuing from actions

#### WordPress Data Integration (`@wpkernel/core/data`)

- **`withKernel(registry)`** - Registry plugin with kernel middleware (renamed from useKernel)
- **`registerWPKernelStore()`** - Store wrapper with actions DSL
- **`wpkEventsPlugin()`** - Automatic error → WordPress notices bridge
- **Full @wordpress/data parity** - Actions work in block editor environments
- **Middleware chain** - Integrates with existing Redux middleware
- **Type safety** - Full TypeScript support for kernel-enhanced stores

#### Documentation

- Complete Actions guide with patterns and examples
- Actions API reference with all functions documented
- WordPress Data Integration guide
- Event flow diagrams and coordination patterns

---

### Added - Sprint 3: Capabilities (Complete Implementation)

#### Capability System (`@wpkernel/core/capability`)

- **`defineCapability()`** - Capability checking with WordPress integration
- **`can()` / `assert()`** - Helper functions for capability checks
- **`useCapability()`** - React hook for component-level capability gates
- **CapabilityContext** - Runtime context management for capability evaluation
- **CapabilityCache** - Caching layer for capability results
- **Automatic UI gating** - Components hide/disable based on capabilities
- **`wpk.capability.denied` events** - Emitted when capability checks fail
- **Capability reporter integration** - All capability checks logged
- **WordPress capability provider** - Integration with WP's cap system
- **24 capability files** - Complete implementation with 6 test suites

#### Type Safety

- Full TypeScript definitions for all capability APIs
- Type-safe capability keys and context
- Compile-time checking for capability usage

---

### Added - Sprint 2: E2E Utils Package

#### Test Utilities (`@wpkernel/e2e-utils`)

- **Namespaced API** - `auth`, `rest`, `store`, `events`, `db`, `project` modules
- **Three import styles** - Scoped (`/auth`), namespace (`{ auth }`), flat (`{ login }`)
- **Playwright fixture** - `kernel` helper with clean API surface
- **Authentication** - `kernel.auth.login()`, `kernel.auth.logout()`
- **REST seeding** - `kernel.rest.seed()`, `kernel.rest.seedMany()`
- **Store coordination** - `kernel.store.wait()` for @wordpress/data resolvers
- **Event capture** - `kernel.events.capture()` for testing event flows
- **Database management** - `kernel.db.restore()` for test isolation
- **Project setup** - `kernel.project.setup()` for environment bootstrap
- **Escape hatch** - Direct `requestUtils` access when needed

#### Testing Infrastructure

- Unit tests for utilities (separate from domain E2E tests)
- Integration tests with Playwright
- CI validation against WordPress 6.8+
- Full fixture integration examples

---

### Added - Sprint 1.5: Build Tooling & Resources Refactor

#### Build System

- **Vite 7 migration** - Library mode for all packages
- **WordPress externals** - `@kucrut/vite-for-wp` plugin integration
- **Tree-shaking verified** - @wordpress/\* packages properly externalized
- **Script Modules support** - Native ESM output for WordPress 6.8+

#### Resources Package Refactor

- **Package reorganization** - `transport/` → `http/`, `errors/` → `error/`, consolidated `resource/store/`
- **Dual-surface API** - 11 thin-flat methods + 7 grouped namespaces
- **Three import patterns** - Scoped, namespace, and flat (all equivalent)
- **Cache utilities** - Consolidated `invalidate()`, `prefetch()`, surgical control
- **Improved ergonomics** - Simpler method names, better TypeScript inference

#### Documentation

- Complete Resources guide with import patterns
- API surface documentation
- Migration notes for cache API changes

---

### Added - Sprint 1: Resources & Stores (V1)

#### Resource System (`@wpkernel/core/resource`)

- **`defineResource()`** - Typed REST contracts with automatic store generation
- **Dual-surface API** - Thin-flat methods + grouped namespaces (select, use, fetch, mutate, cache, store, events)
- **React hooks** - `useGet()`, `useList()`, `usePrefetch()`
- **Cache management** - `invalidate()`, `invalidateAll()`, cache key matching
- **Client methods** - `fetch()`, `create()`, `update()`, `remove()`, `list()`
- **@wordpress/data stores** - Automatic store registration and resolver integration
- **Event emission** - Resource lifecycle events (created, updated, removed)
- **Type generation** - From JSON Schema contracts

#### HTTP Transport (`@wpkernel/core/http`)

- **`fetch()` wrapper** - Standardized REST calls with error handling
- **@wordpress/api-fetch integration** - WordPress nonce and rootURL middleware
- **Correlation IDs** - Request tracking with `requestId`
- **Retry logic** - Automatic exponential backoff for transient failures
- **Error standardization** - All errors extend `WPKernelError`

#### Error System (`@wpkernel/core/error`)

- **`WPKernelError` base class** - Structured errors with serialization
- **`TransportError`** - Network/fetch failures
- **`ServerError`** - WordPress WP_Error responses
- **`CapabilityDeniedError`** - Capability check failures
- **`ValidationError`** - Schema validation errors
- **Type safety** - Full TypeScript definitions for all error types

---

### Added - Sprint 0: Foundation (Baseline)

See [0.1.0] release notes for complete Sprint 0 details including:

- Monorepo infrastructure (pnpm workspaces)
- TypeScript strict mode configuration
- ESLint 9 flat config migration
- Package scaffolding (kernel, ui, cli, e2e-utils)
- Testing harness (Jest + Playwright)
- CI/CD pipelines
- Documentation site (VitePress)
- wp-env + Playground environments

---

### Documentation

- **[NEW] API Contracts Reference** - One-page reference for events, errors, cache keys
- **[NEW] VERSIONING.md** - Semver capability, deprecation process, back-compat guarantees
- **[NEW] Compatibility Matrix** - WordPress, Node, PHP, browser requirements
- **Updated ROADMAP.md** - Reflects Sprint 0-4.5 completion
- **Updated Product Specification** - Marked implemented features
- **Updated internal roadmap** - Sprint status and completion markers

### Changed

- **Node.js requirement**: 22.20.0 → 20.x LTS+ (Vite 7 constraint)
- **pnpm requirement**: 9.12.3+ → 9.0+ (minimum)
- **PHP requirement**: 8.3 → 8.1+ (wp-env only)
- **WordPress requirement**: 6.8+ (Script Modules API required)

### Developer Experience

- **Clear separation**: Plugin developers vs framework contributors
- **Optional tooling**: E2E testing, Docker/wp-env, Playground as alternatives
- **Updated badges**: Node version, compatibility matrix
- **Installation guides**: Split by audience (users vs contributors)

---

## [0.1.1] - 2025-10-01

### Added - Sprint 1 A3: @wordpress/data Store Integration

#### Store Factory

- **createStore factory** - Generates typed @wordpress/data stores from ResourceObject definitions (closes #3)
- **Automatic store registration** - Lazy-loaded stores auto-register with window.wp.data on first access
- **TypeScript store types** - Full type definitions for ResourceState, ResourceActions, ResourceSelectors, ResourceResolvers, ResourceStoreConfig, ResourceStore
- **Normalized state management** - Items stored by ID with separate lists and metadata tracking
- **Redux-compatible reducer** - Handles RECEIVE_ITEM, RECEIVE_ITEMS, RECEIVE_ERROR, INVALIDATE, INVALIDATE_ALL actions
- **Declarative data fetching** - Resolvers automatically fetch data when selectors are used (WordPress data layer pattern)
- **Resolution tracking** - Built-in isResolving, hasStartedResolution, hasFinishedResolution selectors
- **Error handling** - Stores errors by cache key with getError selector
- **Custom configuration** - Support for custom getId and getQueryKey functions, plus initial state

#### Resource Integration

- **Lazy store property** - Added `store` getter to ResourceObject for on-demand store creation
- **Zero configuration** - Stores automatically use resource name, routes, and cache keys
- **Seamless WordPress integration** - Works with @wordpress/data select/dispatch/useSelect APIs

#### Documentation

- **Comprehensive store guide** - Added complete @wordpress/data integration section to docs/guide/resources.md
- **Selector examples** - Documented all selectors (getItem, getItems, getList, getError, resolution helpers)
- **Resolver patterns** - Explained automatic data fetching and error handling
- **Best practices** - Four key patterns for using stores effectively

#### Testing

- **36 new test cases** - Comprehensive coverage for createStore factory
- **Store module coverage** - 93.82% coverage for store creation, reducer, actions, selectors, resolvers
- **defineResource tests** - Added 6 tests for lazy store initialization (window.wp.data registration)
- **Overall coverage** - Improved from 91.6% to 94.8%
- **defineResource coverage** - Improved from 80% to 92.53%

---

## [0.1.0] - 2025-10-01

### Sprint 0 Complete! 🎉 (100%, 18/18 Tasks)

**Status**: Released  
**Completion Date**: 1 October 2025

---

### Added - Sprint 0 Foundation (All Phases Complete)

#### Phase 1: Repository Foundation ✓

- Monorepo structure with pnpm workspaces
- TypeScript 5.9.2 strict configuration with composite builds
- **ESLint 9.36.0 flat config** (migrated from ESLint 8)
- Prettier integration with WordPress code style
- Node.js 22.20.0 LTS requirement (`.nvmrc`)
- Comprehensive `.gitignore` for WordPress, Node, build artifacts

#### Phase 2: Package Scaffolding ✓

- `@wpkernel/core` - Core framework package with Resource, Action, Event, Job APIs
- `@wpkernel/ui` - UI components package
- `@wpkernel/cli` - Code generator CLI (`wpk` command)
- `@wpkernel/e2e-utils` - E2E testing utilities for Playwright

All packages:

- TypeScript strict mode enabled
- ES2022 target with ESNext modules
- Path aliases configured (`@wpkernel/*`)
- Build outputs to `dist/` with declarations
- README with API documentation

#### Phase 2.5: Developer Experience & Tooling ✓

- **VS Code workspace** with 25+ tasks for all workflows
- Debug configurations for Jest and CLI
- Recommended extensions documented
- Format on save + ESLint auto-fix configured
- **30+ validated pnpm scripts** for build, dev, test, WordPress environments
- `scripts/validate-scripts.sh` - Script validation utility
- Complete script documentation (`docs/SCRIPTS.md`, `docs/SCRIPTS_AUDIT.md`)
- `.vscode/README.md` - VS Code usage guide

#### Phase 3: Changesets & Versioning ✓

- `@changesets/cli` installed and configured
- Pre-1.0 versioning strategy (0.x.y releases)
- Initial changesets created for Sprint 0 foundation
- All packages versioned at 0.1.0
- Changeset workflow documented

#### Phase 4: WordPress Environments ✓

- **wp-env configuration** with dev (:8888) and tests (:8889) sites
- Showcase plugin with Script Modules integration (857 bytes minified)
- Plugin active by default with admin bar indicator
- **Comprehensive seed scripts** (idempotent, fully tested):
    - `seed-users.sh` - 5 users (admin, hiring_manager, job_seeker, employer, developer)
    - `seed-content.sh` - 5 job postings with taxonomies
    - `seed-applications.sh` - 10 applications with various statuses
    - `seed-media.sh` - Sample CV PDF and 3 profile images
    - `seed-all.sh` - Master orchestration script
    - Verified idempotency: second run skips existing data
    - Execution time: ~10s first run, ~6s idempotent run
- Lifecycle hook (`init-if-needed.sh`) for automatic seeding on first start
- **WordPress Playground** configured with blueprint.json
- `@wp-playground/cli` installed (+103 packages, 270MB)
- Playground mounts built plugin files via `--mount` flag
- WordPress 6.8.2 boots successfully with plugin activation
- All Phase 4 acceptance criteria met (4/4 tasks complete)

#### Phase 5: Testing Infrastructure ✓

- **Jest** configured with `@wordpress/jest-preset-default`
- 4 passing unit tests for kernel package (VERSION export validation)
- Coverage configuration (0% initially, kernel at 100%)
- Test files in `__tests__/` directories only
- TypeScript support with ts-jest
- **Playwright** configured for E2E testing
- 5 E2E tests passing across 3 browsers (chromium, firefox, webkit):
    1. should login successfully
    2. should see Dashboard heading
    3. should have showcase plugin active
    4. should not have console errors
    5. should load Script Module
- Screenshots/videos on failure enabled
- Retry logic (max 2 retries in CI)
- Targets tests site (:8889)
- All Phase 5 acceptance criteria met (3/3 tasks complete)

#### Phase 6: CI/CD Pipeline ✓

- **GitHub Actions workflow** (`.github/workflows/ci.yml`)
- Jobs: setup → [lint, build, unit-test, e2e-test, changesets-check] → all-checks
- Optimized with shared setup job and artifact reuse
- Node 22.20.0, pnpm 9.12.3, ubuntu-latest
- Caches: pnpm store, Playwright browsers, node_modules
- Artifact upload on failure only (screenshots, videos, traces)
- Performance: 3-5min savings per run with caching
- **License change**: MIT → EUPL-1.2 (stronger copyleft protection)
- All Phase 6 acceptance criteria met (2/2 tasks complete)

#### Phase 7: Documentation ✓

- **VitePress documentation site** (https://theGeekist.github.io/wp-kernel/)
- 24 comprehensive documentation pages (5,746+ lines)
- Complete site structure:
    - Home: Framework overview with hero, features, quick example
    - Getting Started: Introduction, installation, quick start tutorial
    - Guide: Core concepts (Resources, Actions, Events, Bindings, Interactivity, Jobs)
    - API: Reference documentation (placeholder for auto-generated docs in Sprint 1)
    - Contributing: Complete developer workflow (setup, runbook, standards, testing, PRs)
- GitHub Actions auto-deploy workflow (`.github/workflows/docs.yml`)
- Navigation, sidebar, search, footer configured
- Package.json scripts: `docs:dev`, `docs:build`, `docs:preview`
- Dead link checking configured
- `.github/PULL_REQUEST_TEMPLATE.md` - PR submission template with checklist
- `.github/CONTRIBUTOR_LICENSE.md` - EUPL-1.2 explanation for contributors
- All Phase 7 acceptance criteria met (2/2 tasks complete)

#### Developer Experience Enhancements

- **VS Code workspace** with 25+ tasks for all workflows
- Debug configurations for Jest and CLI
- Recommended extensions documented
- Format on save + ESLint auto-fix configured
- **50+ validated pnpm scripts** for build, dev, test, WordPress environments
- Complete documentation in VitePress site
- `.github/copilot-instructions.md` - AI assistant golden path patterns

### Changed

#### ESLint 9 Migration (Zero Deprecations Achievement)

Upgraded entire toolchain to latest versions:

- ESLint: `8.57.1` → `9.36.0` (flat config)
- @typescript-eslint: `v7.18.0` → `v8.45.0`
- eslint-plugin-jest: `27.9.0` → `29.0.1`
- eslint-plugin-react-hooks: `4.6.2` → `5.2.0`

**Strategic pnpm overrides** eliminated **8 deprecated subdependencies**:

- `glob` → `10.4.5` (removes `inflight`)
- `jsdom` → `27.0.0` (removes `abab` + `domexception`)
- `markdownlint-cli` → `0.45.0` (uses glob v11)
- `npm-packlist` → `10.0.2` (no glob v7)
- `source-map-loader` → `5.0.0` (no abab)
- `test-exclude` → `7.0.1` (modern glob)

Result: **Zero deprecated subdependencies, zero peer warnings**

#### React 18 Enforcement

- All dependencies use React 18.3.1 (enforced via pnpm overrides)
- No version conflicts across WordPress packages

#### PHP Namespace Corrections

- All WordPress functions in showcase plugin now use global namespace prefix (`\`)
- Fixes Intelephense undefined function errors

### Documentation

#### VitePress Documentation Site ✓

- Complete documentation site with 24 pages (5,746+ lines)
- Auto-deploy workflow to GitHub Pages
- URL: https://theGeekist.github.io/wp-kernel/
- Navigation, search, sidebar fully configured
- Getting Started guide with prerequisites and tutorial
- Core Concepts guide (Resources, Actions, Events, Bindings, Interactivity, Jobs)
- Contributing guide with complete developer workflow
- Development runbook with 50+ commands and troubleshooting
- Coding standards document
- Testing guide (unit + E2E patterns)
- Pull request process documentation

#### Critical Items Addressed (Product Specification)

- **Section 4.6: Event Taxonomy** - Complete registry with 20+ system events, TypeScript definitions, PHP bridge mapping
- **Section 4.4.1.1: Server Binding Sources** - Attribute-level SSR for SEO, performance budgets, clear limitations
- **Section 5.1: Transport Strategy** - Retry capabilities, timeout hierarchy, circuit breaker pattern

#### New Documentation Created

- **VitePress site** - 24 pages of comprehensive documentation
- `.github/copilot-instructions.md` - AI assistant golden path patterns
- `.github/PULL_REQUEST_TEMPLATE.md` - PR submission template
- `.github/CONTRIBUTOR_LICENSE.md` - EUPL-1.2 contributor explanation
- `information/SPRINT_0_TASKS.md` - Complete Sprint 0 task breakdown (18 tasks)
- `information/REFERENCE - Event Taxonomy Quick Card.md` - Developer cheat sheet
- `README.md` - Updated with Sprint 0 achievements and VitePress links
- `.vscode/README.md` - VS Code workspace usage guide
- Deleted redundant `docs/SCRIPTS.md` and `docs/SCRIPTS_AUDIT.md` (content in VitePress runbook)

---

### Sprint 0 Final Status: 100% Complete (18/18 Tasks) 🎉

**All Phases Complete:**

- ✓ Phase 1: Repository Foundation (3/3 tasks)
- ✓ Phase 2: Package Scaffolding (4/4 tasks)
- ✓ Phase 2.5: Developer Experience (1/1 task)
- ✓ Phase 3: Changesets & Versioning (2/2 tasks)
- ✓ Phase 4: WordPress Environments (4/4 tasks)
- ✓ Phase 5: Testing Infrastructure (3/3 tasks)
- ✓ Phase 6: CI/CD Pipeline (2/2 tasks)
- ✓ Phase 7: Documentation (2/2 tasks)

**Ready for Sprint 1**: Resources + Actions + Events implementation

#### Quality Gates - All Passing ✓

- **Zero** deprecated subdependencies (eliminated 8)
- **Zero** peer dependency warnings
- **Zero** ESLint errors
- **Zero** TypeScript errors
- **Zero** security vulnerabilities
- All builds successful (packages + examples)
- All tests passing (4 unit + 5 E2E across 3 browsers)
- CI green (all jobs passing)
- Documentation site building and deployable

#### Git & Repository

- Initial commit: `cc8862d` - Repository structure
- Commit `36c674c` + `9a9da9d` - Monorepo foundation
- Commit `aa9de1b` - TypeScript configuration
- Commit `0bc517e` + `16c27a9` + `7d7297c` - ESLint & Prettier
- Commit `2538a5c` - All 4 packages scaffolded
- Commit `2ed7ec8` - WordPress environment + VS Code tooling

#### Build System

- Turborepo ready (structure supports)
- Split builds: `build:packages` / `build:examples`
- Parallel watch mode with `pnpm dev`
- Clean scripts: `clean` (all) / `clean:dist` (targeted)
- TypeScript composite builds with project references
- ESM output with Script Modules compatibility

#### Testing Infrastructure ✓

- Jest 29 with `@wordpress/jest-preset-default`
- 4 unit tests passing (kernel package)
- Coverage: 25% overall, kernel at 100%
- Playwright with `@wordpress/e2e-test-utils-playwright`
- 5 E2E tests passing across 3 browsers
- Test execution time: ~1.5s unit, ~15s E2E
- Seed scripts provide consistent test fixtures

---

### Sprint 0 Final Status: 100% Complete (18/18 Tasks) 🎉

---

## Versioning Strategy

### Pre-1.0 Development (Current: 0.x.x)

We are in **pre-1.0 development** where:

- **Minor versions** (0.x.0) may include breaking changes
- **Patch versions** (0.0.x) are for fixes only
- API is still evolving toward stable 1.0 release
- Changesets will document all changes systematically

### Post-1.0 Commitment

Once we reach **1.0.0**, we guarantee:

- **SemVer strict**: MAJOR.MINOR.PATCH
- **Event taxonomy frozen** - names are API contracts
- **Deprecation workflow** - 1 major version warning before removal
- **Type safety preserved** - no silent breakage

---

## Migration Guides

_Will be added as breaking changes are introduced during 0.x.x development_

---

## Release History

### [0.1.0] - 2025-10-01

**Sprint 0 Foundation Release** - Complete Development Environment

**Infrastructure** ✓

- Monorepo with pnpm workspaces
- TypeScript 5.9.2 strict mode
- ESLint 9 flat config (zero deprecations)
- Prettier with WordPress code style
- Build system with parallel watch mode

**Development Environment** ✓

- CI/CD with GitHub Actions (optimized caching)
- Commit hooks (lint-staged + Husky)
- wp-env (WordPress 6.8+, PHP 8.3)
- WordPress Playground integration
- WordPress Playground (WASM)
- Seed scripts (5 users, 5 jobs, 10 applications, 4 media files)
- Script Modules API integration
- Showcase plugin (857 bytes minified)

**Testing** ✓

- Jest with 4 unit tests (25% coverage)
- Playwright with 5 E2E tests (3 browsers)
- CI pipeline with GitHub Actions
- All quality gates passing

**Documentation** ✓

- VitePress site (24 pages, 5,746+ lines)
- Auto-deploy to GitHub Pages
- Complete developer guides
- Contributing workflow
- API reference placeholders

**Developer Experience** ✓

- VS Code workspace (25+ tasks)
- 50+ validated pnpm scripts
- Debug configurations
- PR template and contributor license
- GitHub Copilot instructions

**Quality Gates** ✓

- Zero deprecated dependencies
- Zero peer warnings
- Zero lint errors
- Zero TypeScript errors
- All builds passing
- All tests passing
- CI green

**License**: EUPL-1.2 (European Union Public Licence)

---

**Known Limitations:**

- Core framework APIs not yet implemented (Resources, Actions, Events, Jobs)
- No published npm packages yet
- API reference documentation placeholders only (will be auto-generated in Sprint 1)
- No production usage recommended (pre-1.0 development)

**Next Sprint**: Sprint 1 - Resources, Actions & Events implementation

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose changes and create changesets.

All changes should:

1. Include a changeset (`pnpm changeset`)
2. Follow conventional commits
3. Update this CHANGELOG automatically via CI

---

**Maintained by**: [@theGeekist](https://github.com/theGeekist)  
**Project**: [wp-kernel](https://github.com/theGeekist/wp-kernel)  
**Last Updated**: 1 October 2025

---

<!-- Version comparison links -->

[Unreleased]: https://github.com/theGeekist/wp-kernel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/theGeekist/wp-kernel/releases/tag/v0.1.0
