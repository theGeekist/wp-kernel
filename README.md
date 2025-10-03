# WP Kernel

> A Rails-like, opinionated framework for building modern WordPress products where JavaScript is the source of truth and PHP is a thin contract.

[![CI Status](https://github.com/theGeekist/wp-kernel/workflows/ci/badge.svg)](https://github.com/theGeekist/wp-kernel/actions)
[![License](https://img.shields.io/badge/license-EUPL--1.2-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-22.20.0%20LTS-brightgreen.svg)](.nvmrc)
[![Documentation](https://img.shields.io/badge/docs-VitePress-42b883.svg)](https://theGeekist.github.io/wp-kernel/)

---

## 🎯 What is WP Kernel?

WP Kernel provides a **Golden Path** for WordPress development in 2025+:

- **Actions-first**: UI never writes directly to transport (enforced by lint + runtime)
- **Resources**: Typed REST contracts → client + store + cache keys
- **Views**: Core Blocks + Bindings + Interactivity (no custom blocks needed)
- **Jobs**: Background work with polling and status tracking
- **Events**: Canonical taxonomy with PHP bridge for extensibility
- **Single PHP contract**: REST + capabilities + optional server bindings

Built on WordPress Core primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

**[Read the documentation](https://theGeekist.github.io/wp-kernel/)** to get started, or see **[Why WP Kernel?](https://theGeekist.github.io/wp-kernel/getting-started/why)** to understand the philosophy.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 22.20.0 LTS ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **pnpm**: 9.12.3+ (`npm install -g pnpm`)
- **Docker**: For local WordPress via wp-env
- **PHP**: 8.3+ (for wp-env)
- **WordPress**: 6.7+ (Script Modules API)

### Installation

```bash
# Clone the repository
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel

# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start WordPress (dev:8888, tests:8889) + seed test data
pnpm wp:fresh
```

Visit [http://localhost:8888/wp-admin](http://localhost:8888/wp-admin)  
Login: `admin` / `password`

---

## 📦 Import Patterns

WP Kernel supports three flexible import patterns. Choose what fits your project:

### 1. Scoped Imports (Recommended)

Tree-shakeable, clear module boundaries. Best for production apps.

```typescript
import { fetch } from '@geekist/wp-kernel/http';
import { defineResource, invalidate } from '@geekist/wp-kernel/resource';
import { KernelError } from '@geekist/wp-kernel/error';
```

### 2. Namespace Imports

Organized by module. Good for mid-sized projects.

```typescript
import { http, resource, error } from '@geekist/wp-kernel';

await http.fetch({ path: '/wpk/v1/things' });
const thing = resource.defineResource({ name: 'thing', routes: {...} });
throw new error.KernelError('ValidationError', {...});
```

### 3. Flat Imports

Quick and simple. Good for prototyping.

```typescript
import { fetch, defineResource, KernelError } from '@geekist/wp-kernel';
```

All patterns work identically - pick what you prefer. The framework doesn't care.

---

## 📦 Packages

| Package                                            | Description                                            | Version |
| -------------------------------------------------- | ------------------------------------------------------ | ------- |
| [@geekist/wp-kernel](packages/kernel)              | Core framework (Resources, Actions, Events, Jobs)      | 0.1.0   |
| [@geekist/wp-kernel-ui](packages/ui)               | Accessible UI components (wraps @wordpress/components) | 0.1.0   |
| [@geekist/wp-kernel-cli](packages/cli)             | Scaffolding CLI (generators)                           | 0.1.0   |
| [@geekist/wp-kernel-e2e-utils](packages/e2e-utils) | Playwright test utilities                              | 0.1.0   |

---

## 🛠️ Development Commands

```bash
# Development
pnpm dev            # Watch mode for all packages
pnpm build          # Production build
pnpm clean          # Clean build artifacts

# WordPress
pnpm wp:start       # Start wp-env (dev + tests sites)
pnpm wp:stop        # Stop wp-env
pnpm wp:seed        # Seed test data
pnpm wp:fresh       # Start + seed in one command
pnpm wp:seed:reset  # Reset database

# Testing
pnpm test           # Unit tests (Jest)
pnpm e2e            # E2E tests (Playwright)
pnpm test:watch     # Watch mode for unit tests

# Quality
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # TypeScript check

# Playground
pnpm playground     # Launch WordPress Playground (WASM)
```

---

## 📚 Documentation

**📖 [Official Documentation](https://theGeekist.github.io/wp-kernel/)** - Complete guide with 24 pages

### Quick Links

- **[Getting Started](https://theGeekist.github.io/wp-kernel/getting-started/)** - Installation and quick start tutorial
- **[Core Concepts](https://theGeekist.github.io/wp-kernel/guide/)** - Resources, Actions, Events, Bindings, Interactivity, Jobs
- **[API Reference](https://theGeekist.github.io/wp-kernel/api/)** - Type definitions and interfaces
- **[Contributing Guide](https://theGeekist.github.io/wp-kernel/contributing/)** - Development workflow and standards

### Project Documentation

- **[Foreword](information/Foreword.md)** - Why WP Kernel exists, mental model
- **[Product Specification](information/Product%20Specification%20PO%20Draft%20•%20v1.0.md)** - Complete API contracts and guarantees
- **[Code Primitives](information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20•%20v1.0.md)** - Error model, network strategy, testing approach
- **[Sprint 0 Tasks](information/SPRINT_0_TASKS.md)** - Sprint 0 completion status (100% ✅)
- **[Event Taxonomy](information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)** - All events and payloads

---

## 🏗️ Architecture at a Glance

```
┌─────────────┐
│ UI/View     │ (Blocks + Bindings + Interactivity)
└──────┬──────┘
       │ triggers
┌──────▼──────┐
│ Action      │ (Orchestration: validates, calls resource, emits events)
└──────┬──────┘
       │ calls
┌──────▼──────┐
│ Resource    │ (Typed REST client + @wordpress/data store)
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│ WordPress   │ (REST API + capabilities + CPTs)
└─────────────┘
       ▲
       │ listens (optional)
┌──────┴──────┐
│ PHP Bridge  │ (Mirrors selected JS events for legacy/integrations)
└─────────────┘
```

**Read path**: View → Bindings → Store selectors  
**Write path**: View → Action → Resource → Events + cache invalidation

---

## 🎓 Example: Create a Resource

```typescript
// app/resources/Thing.ts
import { defineResource } from '@geekist/wp-kernel/resource';

export const thing = defineResource<Thing>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: () => ['thing', 'list'],
		get: (id) => ['thing', 'get', id],
	},
});
```

This gives you:

- ✅ Typed client methods (`thing.fetchList()`, `thing.fetch()`, `thing.create()`)
- ✅ @wordpress/data store with selectors
- ✅ Automatic cache management
- ✅ Request/response events

**See [Product Spec § 4.1](information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) for details.**

---

## 📋 Current Status

**Sprint 0**: ✅ **Complete** (100%, 18/18 tasks)  
**Next Sprint**: Sprint 1 - Resources, Actions & Events implementation

### Sprint 0 Achievements

- ✅ Monorepo with pnpm workspaces + TypeScript strict mode
- ✅ ESLint 9 flat config + Prettier (zero deprecated dependencies)
- ✅ WordPress environments: wp-env + Playground
- ✅ Testing: Jest (4 tests) + Playwright (5 E2E tests across 3 browsers)
- ✅ CI/CD: GitHub Actions with caching and quality gates
- ✅ Documentation: VitePress site with 24 pages (5,746+ lines)
- ✅ Developer Experience: VS Code workspace with 25+ tasks
- ✅ Seed scripts: 5 users, 5 jobs, 10 applications, 4 media files
- ✅ Changesets configured for semantic versioning

See **[Sprint 0 Tasks](information/SPRINT_0_TASKS.md)** for complete breakdown.

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](https://theGeekist.github.io/wp-kernel/contributing/)** before submitting PRs.

**Quick contribution flow**:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm test && pnpm e2e`
5. Commit using conventional commits
6. Create a changeset (`pnpm changeset`)
7. Push and open a PR

**Development Setup**:

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm wp:fresh       # Start WordPress + seed data
pnpm test           # Run unit tests
pnpm e2e            # Run E2E tests
```

---

## 📄 License

### Framework: EUPL-1.2

The WP Kernel framework (packages: `@geekist/wp-kernel`, `@geekist/wp-kernel-ui`, `@geekist/wp-kernel-cli`, `@geekist/wp-kernel-e2e-utils`) is licensed under **EUPL-1.2** (European Union Public License v1.2).

**This means you CAN**:
✅ Build commercial plugins and themes  
✅ Build SaaS products  
✅ Keep your application code proprietary  
✅ Sell products built with WP Kernel

**You only need to share**:

- Modifications to the framework itself (if you distribute them)

### Showcase App: GPL-2.0-or-later

The showcase WordPress plugin (`app/showcase`) is licensed under **GPL-2.0-or-later** to comply with WordPress.org requirements. This is example/reference code meant to demonstrate framework usage.

### 📖 Full Licensing Guide

For comprehensive information about:

- Building commercial products with WP Kernel
- WordPress.org plugin publishing
- SaaS and premium version patterns
- Frequently asked questions

**Read the complete guide**: [LICENSING.md](LICENSING.md)

**For Contributors**: By contributing, you agree to license your contributions under EUPL-1.2 while retaining copyright. See [.github/CONTRIBUTOR_LICENSE.md](.github/CONTRIBUTOR_LICENSE.md) for details.

---

## 🙏 Acknowledgments

Built on the shoulders of giants:

- **WordPress Core Team** - Gutenberg, Script Modules, Interactivity API
- **@wordpress packages** - The foundation we build upon
- **Rails** - Inspiration for conventions and the Golden Path philosophy

---

## 🔗 Links

- **[Documentation](https://theGeekist.github.io/wp-kernel/)** - Official docs site
- **[GitHub Repository](https://github.com/theGeekist/wp-kernel)** - Source code
- **[Issues](https://github.com/theGeekist/wp-kernel/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/theGeekist/wp-kernel/discussions)** - Community Q&A

---

<br>
<br>
<p align="center">
  <sub>
    Proudly brought to you by 
    <a href="https://github.com/theGeekist" target="_blank">@theGeekist</a> and <a href="https://github.com/pipewrk" target="_blank">@pipewrk</a>
  </sub>
</p>
