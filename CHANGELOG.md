# Changelog

All notable changes to the WP Kernel project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added - Sprint 0 Progress (Phases 1-3)

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

#### Phase 3: WordPress Environments ✅ (Partial)
- **wp-env configuration** with WordPress 6.7 + PHP 8.3
- Dev environment on `:8888`, tests environment on `:8889`
- **Script Modules API integration** verified and working
- **Showcase plugin** demonstrating Script Module registration
  - ESM module with `@wordpress/dom-ready` imports
  - Webpack build: 857 bytes minified
  - Active by default in wp-env
- WordPress lifecycle scripts (`afterStart` seed hook)
- `pnpm wp:*` commands: start, stop, restart, cli, logs, seed, fresh
- **PHP CodeSniffer** configuration for WordPress standards

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

#### Critical Items Addressed (Product Specification)
- **Section 4.6: Event Taxonomy** - Complete registry with 20+ system events, TypeScript definitions, PHP bridge mapping
- **Section 4.4.1.1: Server Binding Sources** - Attribute-level SSR for SEO, performance budgets, clear limitations
- **Section 5.1: Transport Strategy** - Retry policies, timeout hierarchy, circuit breaker pattern

#### New Documentation Created
- `.github/copilot-instructions.md` - AI assistant golden path patterns
- `information/SPRINT_0_TASKS.md` - 30+ actionable tasks across 7 phases
- `information/REFERENCE - Event Taxonomy Quick Card.md` - Developer cheat sheet
- `docs/SCRIPTS.md` - Complete scripts reference
- `docs/SCRIPTS_AUDIT.md` - Full validation report
- `.vscode/README.md` - VS Code workspace usage guide

### Infrastructure

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

#### Testing Infrastructure (Partial)
- Jest configuration with `@wordpress/jest-preset-default`
- Playwright ready (config pending Phase 4)
- Seed script infrastructure created (scripts pending Task 3.3)

### Sprint 0 Status: 47% Complete (8/17 Tasks)

**Completed:**
- ✅ Phase 1: Repository Foundation (3/3 tasks)
- ✅ Phase 2: Package Scaffolding (4/4 tasks)
- ✅ Phase 2.5: Developer Experience (1/1 task - NEW)

**In Progress:**
- ⏳ Phase 3: WordPress Environments (2/4 tasks)
  - ✅ Task 3.1: wp-env Configuration
  - ✅ Task 3.2: Showcase Plugin Stub
  - ⏳ Task 3.3: Seed Scripts (infrastructure ready)
  - ⏳ Task 3.4: Playground Configuration (command ready)

**Pending:**
- Phase 4: Testing Infrastructure (0/3 tasks)
- Phase 5: CI/CD Pipeline (0/2 tasks)
- Phase 6: Documentation (0/4 tasks)
- Phase 7: Changesets Setup (0/1 task - **BEING MOVED UP**)

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

### 0.1.0 - [Unreleased]
**Sprint 0 Foundation Release**

Initial scaffolding with:
- Monorepo structure (4 packages)
- TypeScript + ESLint 9 + Prettier
- wp-env WordPress 6.7 environment
- Script Modules API integration
- VS Code workspace with 25+ tasks
- 30+ validated pnpm scripts

**Known Limitations:**
- No published npm packages yet
- Seed scripts incomplete
- Playground config untested
- CI/CD pipeline pending
- Documentation incomplete

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
