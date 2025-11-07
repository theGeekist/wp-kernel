# WP Kernel Roadmap

**Status**: Active development toward v1.0
**Latest Release**: v0.11.0 (November 2025)

---

## ✓ Completed

### Foundation (Sprints 0-1.5)

Monorepo infrastructure, TypeScript strict mode, Vite 7 builds, testing harness (Jest + Playwright), CI/CD, documentation site, wp-env + Playground environments. 58+ test files, 970+ tests.

### Resources & Data (Sprint 1)

`defineResource()` with typed REST contracts, automatic @wordpress/data stores, cache management (invalidate, invalidateAll, cache key matching), React hooks (useGet, useList, usePrefetch), dual-surface API (thin-flat + grouped), client methods (fetch, create, update, remove).

### E2E Utils (Sprint 2)

`@wpkernel/e2e-utils` package with namespaced API, Playwright fixture, test helpers (auth, rest, store, events, db, project), utility unit tests separated from domain E2E tests. Full fixture integration.

### Capabilities (Sprint 3)

`defineCapability()` with full capability checking, `can()`/`assert()` helpers, `useCapability()` React hook, capability context management, caching layer, automatic UI control gating, `wpk.capability.denied` events, capability reporter integration, WordPress capability provider.

### Actions (Sprint 4)

Write-path orchestration with `defineAction()`, middleware layer, lifecycle events (`wpk.action.start/complete/error`), cache invalidation, error handling, domain events (`{namespace}.{resource}.created/updated/removed`).

### WordPress Data Integration (Sprint 4)

`configureWPKernel()` provides two integration layers: 1) Registry integration (`wpkEventsPlugin` bridges errors → `core/notices`, connects lifecycle events to `wp.hooks` for ecosystem extensibility, reporter integration) - recommended for production, and 2) Redux middleware (`createActionMiddleware` enables action dispatch via envelopes) - only needed when using `useAction()` React hook. Resources auto-register stores without the bootstrap.

### Unified Reporting (Sprint 4.5)

`createReporter()` with pluggable transports (console, hooks, "all" channel), consolidated logging across all packages, request correlation IDs, reporter context management, noop reporter for production.

### React Hooks Integration (Sprint 5 - Completed, v0.4.0)

- ✓ `useAction()` - Complete action dispatch system with 4 concurrency modes
- ✓ `useGet()` & `useList()` - Resource data fetching hooks
- ✓ `useCapability()` - Capability checks in UI
- ✓ Prefetching hooks: `usePrefetcher()`, `useVisiblePrefetch()`, `useHoverPrefetch()`, `useNextPagePrefetch()`
- ✓ Lazy attachment mechanism for resources defined before UI loads

### Architecture Implementation Sprint 5.5 (Phases 1-9), Completed v0.4.0

Completed the bootstrap transition to `configureWPKernel()`, replaced global UI shims with the adapter-driven runtime, introduced the typed event bus, unified action/capability/job signatures around configuration objects, threaded resource reporters through client/store/cache/transport for full observability, and refreshed the documentation stack so every guide, reference, and showcase page matches the final architecture.

**Phase 8 - Resource Reporter Wiring**: Propagated kernel reporters through resource definitions, clients, store resolvers, and grouped APIs with comprehensive 615-line test suite. Resources now emit structured telemetry aligned with actions/capabilities.

**Phase 9 - Cache & Transport Telemetry**: Extended reporter hierarchy to cache invalidation and transport layer. Request lifecycles now share correlation IDs and structured logs from resource → client → transport → cache. Fully backwards compatible.

---

## 🚧 In Progress

**Guided Examples & Bindings** (post-architecture polish)
Deepen the learning surface with refreshed block binding walkthroughs, Interactivity API blueprints, and expanded showcase coverage that demonstrates the completed kernel architecture in practice.

---

## 🔮 Upcoming

**Sprint 6** - Admin Mount & UI Surface (minimal admin scaffolding)  
**Sprint 7** - CLI Scaffolder (project initialization, resource generators)  
**Sprint 9** - PHP Bridge (JS → PHP event mirroring, legacy plugin integration) ⬅️ **Next Up**  
**Sprint 10** - Server Bindings (SSR for SEO-critical fields)  
**Sprint 11** - SlotFill (UI extension points)  
**Sprint 13** - CI Matrices & Playgrounds (expanded WP/PHP test matrices)  
**Sprint 14-16** - Showcase App (public discovery, applications, admin pipeline)  
**Sprint 17** - Hardening (performance, accessibility, i18n) - DataViews accessibility backlog: - Keyboard trap audit across bulk actions and inline forms - High contrast + dark mode sweep for table rows and selection chips - ARIA announcements for async bulk action results and preference errors - Documented escape hatches for screen reader only copy in ResourceDataView
**Sprint 18** - Documentation v2 & Migration Guide

**Note:** Sprint 8 (Jobs & background processing) has been descoped. Sprint 12 (Reporter & Transport Middleware) was completed as part of Sprint 4.5 (Unified Reporting).

---

## Timeline

| Phase            | Status     |
| ---------------- | ---------- |
| Alpha (v0.1.x)   | ✓ Complete |
| Beta (v0.4.x)    | ✓ Complete |
| **RC** (v0.10.x) | Planned    |
| **v1.0**         | Planned    |

---

**Get Involved**: [GitHub](https://github.com/theGeekist/wp-kernel) · [Issues](https://github.com/theGeekist/wp-kernel/issues) · [Contributing](https://theGeekist.github.io/wp-kernel/contributing/)

_Last updated: November 5, 2025_
