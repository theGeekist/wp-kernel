# WP Kernel

> A Rails-like, opinionated framework for building modern WordPress products where JavaScript is the source of truth and PHP is a thin contract.

[![CI Status](https://github.com/theGeekist/wp-kernel/workflows/ci/badge.svg)](https://github.com/theGeekist/wp-kernel/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-22.20.0%20LTS-brightgreen.svg)](.nvmrc)

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

**Read the [Foreword](information/Foreword.md) to understand why this exists.**

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 22.20.0 LTS ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **pnpm**: 9+ (`npm install -g pnpm`)
- **Docker**: For local WordPress via wp-env
- **PHP**: 8.3+ (for wp-env)

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

## 📦 Packages

| Package | Description | Status |
|---------|-------------|--------|
| [@geekist/wp-kernel](packages/kernel) | Core framework (Resources, Actions, Events, Jobs) | 🚧 Sprint 0 |
| [@geekist/wp-kernel-ui](packages/ui) | Accessible UI components (wraps @wordpress/components) | 🚧 Sprint 0 |
| [@geekist/wp-kernel-cli](packages/cli) | Scaffolding CLI (generators) | 🚧 Sprint 0 |
| [@geekist/wp-kernel-e2e-utils](packages/e2e-utils) | Playwright test utilities | 🚧 Sprint 0 |

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

### Core Concepts
- **[Foreword](information/Foreword.md)** - Why WP Kernel exists, mental model
- **[Product Specification](information/Product%20Specification%20PO%20Draft%20•%20v1.0.md)** - Complete API contracts
- **[Code Primitives](information/Code%20Primitives%20%26%20Dev%20Tooling%20PO%20Draft%20•%20v1.0.md)** - Error model, transport, testing

### Developer Guides
- **[Sprint 0 Setup](information/Sprint%200%20—%20Environment%20%26%20Tooling.md)** - Environment configuration
- **[CONTRIBUTING](CONTRIBUTING.md)** - How to contribute
- **[TESTING](TESTING.md)** - Testing conventions
- **[RUNBOOK](RUNBOOK.md)** - Common tasks and troubleshooting

### References
- **[Event Taxonomy](information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md)** - All events and payloads
- **[Copilot Instructions](.github/copilot-instructions.md)** - AI assistant guide

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
    list: { path: '/gk/v1/things', method: 'GET' },
    get: { path: '/gk/v1/things/:id', method: 'GET' },
    create: { path: '/gk/v1/things', method: 'POST' }
  },
  schema: import('../../contracts/thing.schema.json'),
  cacheKeys: {
    list: () => ['thing', 'list'],
    get: (id) => ['thing', 'get', id]
  }
});
```

This gives you:
- ✅ Typed client methods (`thing.list()`, `thing.create()`)
- ✅ @wordpress/data store with selectors
- ✅ Automatic cache management
- ✅ Request/response events

**See [Product Spec § 4.1](information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) for details.**

---

## 📋 Current Status

**Sprint**: Sprint 0 (Environment & Tooling)  
**Phase**: Foundation  
**Next**: Sprint 1 (Resources & Stores)

See [Sprint 0 Tasks](information/SPRINT_0_TASKS.md) for detailed breakdown.

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting PRs.

**Quick contribution flow**:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm test && pnpm e2e`
5. Commit using conventional commits
6. Create a changeset (`pnpm changeset`)
7. Push and open a PR

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built on the shoulders of giants:
- **WordPress Core Team** - Gutenberg, Script Modules, Interactivity API
- **@wordpress packages** - The foundation we build upon
- **Rails** - Inspiration for conventions and the Golden Path philosophy

---

## 🔗 Links

- **Documentation**: [/information](information/)
- **Issues**: [GitHub Issues](https://github.com/theGeekist/wp-kernel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/theGeekist/wp-kernel/discussions)

---

**Made with ❤️ by developers who love WordPress but want better DX.**
