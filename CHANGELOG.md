# Changelog

All notable changes to the WP Kernel project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No unreleased changes yet._

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

#### Phase 1: Repository Foundation ✅

- Monorepo structure with pnpm workspaces
- TypeScript 5.9.2 strict configuration with composite builds
- **ESLint 9.36.0 flat config** (migrated from ESLint 8)
- Prettier integration with WordPress code style
- Node.js 22.20.0 LTS requirement (`.nvmrc`)
- Comprehensive `.gitignore` for WordPress, Node, build artifacts

#### Phase 2: Package Scaffolding ✅

- `@geekist/wp-kernel` - Core framework package with Resource, Action, Event, Job APIs
- `@geekist/wp-kernel-ui` - UI components package
- `@geekist/wp-kernel-cli` - Code generator CLI (`wpk` command)
- `@geekist/wp-kernel-e2e-utils` - E2E testing utilities for Playwright

All packages:

- TypeScript strict mode enabled
- ES2022 target with ESNext modules
- Path aliases configured (`@geekist/*`)
- Build outputs to `dist/` with declarations
- README with API documentation

#### Phase 2.5: Developer Experience & Tooling ✅

- **VS Code workspace** with 25+ tasks for all workflows
- Debug configurations for Jest and CLI
- Recommended extensions documented
- Format on save + ESLint auto-fix configured
- **30+ validated pnpm scripts** for build, dev, test, WordPress environments
- `scripts/validate-scripts.sh` - Script validation utility
- Complete script documentation (`docs/SCRIPTS.md`, `docs/SCRIPTS_AUDIT.md`)
- `.vscode/README.md` - VS Code usage guide

#### Phase 3: Changesets & Versioning ✅

- `@changesets/cli` installed and configured
- Pre-1.0 versioning strategy (0.x.y releases)
- Initial changesets created for Sprint 0 foundation
- All packages versioned at 0.1.0
- Changeset workflow documented

#### Phase 4: WordPress Environments ✅

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

#### Phase 5: Testing Infrastructure ✅

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

#### Phase 6: CI/CD Pipeline ✅

- **GitHub Actions workflow** (`.github/workflows/ci.yml`)
- Jobs: setup → [lint, build, unit-test, e2e-test, changesets-check] → all-checks
- Optimized with shared setup job and artifact reuse
- Node 22.20.0, pnpm 9.12.3, ubuntu-latest
- Caches: pnpm store, Playwright browsers, node_modules
- Artifact upload on failure only (screenshots, videos, traces)
- Performance: 3-5min savings per run with caching
- **License change**: MIT → EUPL-1.2 (stronger copyleft protection)
- All Phase 6 acceptance criteria met (2/2 tasks complete)

#### Phase 7: Documentation ✅

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

#### VitePress Documentation Site ✅

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
- **Section 5.1: Transport Strategy** - Retry policies, timeout hierarchy, circuit breaker pattern

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

- ✅ Phase 1: Repository Foundation (3/3 tasks)
- ✅ Phase 2: Package Scaffolding (4/4 tasks)
- ✅ Phase 2.5: Developer Experience (1/1 task)
- ✅ Phase 3: Changesets & Versioning (2/2 tasks)
- ✅ Phase 4: WordPress Environments (4/4 tasks)
- ✅ Phase 5: Testing Infrastructure (3/3 tasks)
- ✅ Phase 6: CI/CD Pipeline (2/2 tasks)
- ✅ Phase 7: Documentation (2/2 tasks)

**Ready for Sprint 1**: Resources + Actions + Events implementation

#### Quality Gates - All Passing ✅

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

#### Testing Infrastructure ✅

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

**Infrastructure** ✅

- Monorepo with pnpm workspaces
- TypeScript 5.9.2 strict mode
- ESLint 9 flat config (zero deprecations)
- Prettier with WordPress code style
- Build system with parallel watch mode

**Development Environment** ✅

- wp-env (WordPress 6.7+, PHP 8.3)
- WordPress Playground (WASM)
- Seed scripts (5 users, 5 jobs, 10 applications, 4 media files)
- Script Modules API integration
- Showcase plugin (857 bytes minified)

**Testing** ✅

- Jest with 4 unit tests (25% coverage)
- Playwright with 5 E2E tests (3 browsers)
- CI pipeline with GitHub Actions
- All quality gates passing

**Documentation** ✅

- VitePress site (24 pages, 5,746+ lines)
- Auto-deploy to GitHub Pages
- Complete developer guides
- Contributing workflow
- API reference placeholders

**Developer Experience** ✅

- VS Code workspace (25+ tasks)
- 50+ validated pnpm scripts
- Debug configurations
- PR template and contributor license
- GitHub Copilot instructions

**Quality Gates** ✅

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
