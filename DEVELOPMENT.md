# Development Guide - WPKernel Monorepo

> **Who this doc is for**: Contributors working| **E2E tests** | `pnpm e2e` | Tasks: Test: E2E Tests | Playwright (headless) - **works from any directory** |
> | **E2E debug** | `pnpm e2e:ui` | Tasks: Test: E2E Tests (UI) | Playwright with UI - **works from any directory** |irectly on WPKernel or the Showcase Plugin. If you only want to _use_ the framework in your own plugin, see the [Getting Started Guide](docs/getting-started/) instead.

> **Critical infrastructure docs** - How to actually work with this monorepo

## 🏗️ Architecture Overview

WPKernel is a **pnpm workspace monorepo** with centralized dependency management and integrated WordPress testing infrastructure.

```
wp-kernel/
├── packages/          # Framework packages (published)
│   ├── core/        # Core framework
│   ├── ui/            # UI components
│   ├── cli/           # CLI tools
│   └── e2e-utils/     # E2E testing utilities
├── examples/showcase/      # Demo plugin (validates framework)
└── test-harness/      # Development infrastructure
    ├── playground/    # WordPress Playground config
    └── wp-env/        # wp-env setup & database seeding
```

### 🎯 Golden Rules

| Component         | Purpose                                                  | Development Focus                                      |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| **Core packages** | Reusable primitives (resources, actions, events, jobs)   | Framework code only - no business logic                |
| **Showcase app**  | Business/domain demo plugin (jobs & applications system) | Real-world patterns that exercise all wpk capabilities |
| **e2e-utils**     | Testing utilities (validated via showcase)               | Browser-only code, can't be unit tested in isolation   |

- Import lifecycle phases, namespace constants, and CLI exit codes from `@wpkernel/core/contracts`; never hardcode `wpk` or numeric exit codes in tooling.

## 🚀 Essential Workflow

### 1. **First Setup**

```bash
# Install Node 20+ LTS (20.x or higher)
nvm use

# Install dependencies (centralized in root)
pnpm install

# Build all packages
pnpm build

# Start WordPress with test data
pnpm wp:fresh
```

### 2. **Daily Development**

```bash
# Start dev mode (rebuilds on changes)
pnpm dev

# In another terminal - start WordPress
pnpm wp:start

# Your sites:
# • Development: http://localhost:8888 (admin/password)
# • E2E Testing:  http://localhost:8889 (auto-seeded)
```

### 3. **Testing Workflow**

```bash
# Unit tests (Jest) - fast, no WordPress needed
# ⚡ Default behavior: Fails fast on first error (bail: 1)
pnpm test

# Run all tests regardless of failures
pnpm test --no-bail

# Stop after N failures (useful for debugging)
pnpm test --maxFailures=5

# Watch mode (auto-disables bail for continuous testing)
pnpm test:watch

# E2E tests (Playwright) - requires wp-env running
# ✓ Can run from root OR examples/showcase directory
pnpm e2e

# E2E with UI for debugging
pnpm e2e:ui

# E2E single browser
pnpm e2e --project chromium
```

> **⚡ Fail-Fast Default**: All Jest test runs stop on the first failure to provide immediate feedback. This is especially valuable with >2.1k tests - you'll know about issues in seconds rather than waiting for the full suite. Use `--no-bail` to run all tests when needed (e.g., checking total failure count).

## 🔧 Core Scripts Cheat Sheet

| Task                  | Script                                                                             | VS Code Task                      | Purpose                                                                   |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------- |
| **Setup**             | `pnpm install`                                                                     | Tasks: Install                    | Install all dependencies                                                  |
| **Build**             | `pnpm build`                                                                       | Tasks: Build All                  | One-shot production build                                                 |
| **Dev mode**          | `pnpm dev`                                                                         | Tasks: Dev: Watch All             | Rebuild packages on changes                                               |
| **WordPress**         | `pnpm wp:fresh`                                                                    | Tasks: WordPress: Fresh Start     | Start WP + seed test data                                                 |
| **Unit tests**        | `pnpm test`                                                                        | Tasks: Test: Unit Tests           | Jest tests (no WordPress)                                                 |
| **E2E tests**         | `pnpm e2e`                                                                         | Tasks: Test: E2E Tests            | Playwright (headless) - **run from root only**                            |
| **E2E debug**         | `pnpm e2e:ui`                                                                      | Tasks: Test: E2E Tests (UI)       | Playwright with UI - **run from root only**                               |
| **Format**            | `pnpm format`                                                                      | Tasks: Format                     | Prettier code formatting                                                  |
| **Type check**        | `pnpm typecheck`                                                                   | Tasks: TypeCheck: All             | TypeScript validation                                                     |
| **Release gate**      | `pnpm --filter @wpkernel/cli exec tsx scripts/check-release-pack-ci.ts`            | Workflow: Release Pack Readiness  | Deterministic publish-order + artefact verification (same helper CI runs) |
| **Bootstrapper gate** | `pnpm --filter @wpkernel/cli exec tsx scripts/check-bootstrapper-resolution-ci.ts` | Workflow: Bootstrapper Resolution | Executes the compiled create-wpk bootstrapper in an isolated workspace    |

> **💡 Pro Tip**: Use VS Code tasks (`Cmd+Shift+P` → "Run Task") - they're pre-configured and more reliable than remembering scripts!

## 🧪 Test Infrastructure Explained

### **Why Two WordPress Sites?**

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│       Development Site             │    │         E2E Testing Site            │
│       localhost:8888                │    │         localhost:8889              │
├─────────────────────────────────────┤    ├─────────────────────────────────────┤
│ • Manual testing & debugging       │    │ • Automated Playwright tests       │
│ • Content creation & exploration    │    │ • Clean, seeded data every run     │
│ • WordPress admin access           │    │ • Consistent test environment      │
│ • Live development changes         │    │ • Screenshots/videos on failure    │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
              ↕ manual                                    ↕ automated
         Human developers                            Playwright tests
```

### **Database Seeding**

The `test-harness/wp-env/seeds/` scripts populate test data:

```bash
pnpm wp:seed        # Add test data to current DB
pnpm wp:seed:reset  # Reset DB + seed fresh data
pnpm wp:fresh       # Start WordPress + seed (one command)
```

**What gets seeded:**

- Test users (editor, author, subscriber)
- Sample jobs and applications
- Media uploads
- WordPress content (posts, pages)

### **Test Results & Build Outputs**

| Test Type                  | Results Location                  | What You'll Find                                         |
| -------------------------- | --------------------------------- | -------------------------------------------------------- |
| **Unit Tests (Jest)**      | `coverage/lcov-report/index.html` | Coverage report with line-by-line analysis               |
| **E2E Tests (Playwright)** | `playwright-report/index.html`    | Interactive test report with traces                      |
| **E2E Failures**           | `test-results/[test-name]/`       | Screenshots (`test-failed-*.png`), videos (`video.webm`) |
| **Build Outputs**          | `packages/*/dist/`                | Framework package builds                                 |
| **Showcase Build**         | `examples/showcase/build/`        | WordPress plugin assets                                  |

> **🔍 Debugging Tip**: Always check `playwright-report/index.html` first - it shows test execution traces and failure points.

## 📦 Dependency Management

### **Centralized Strategy**

- **Root package.json**: ALL external dependencies (typescript, vite, etc.)
- **Package package.json**: Only internal workspace deps (`workspace:*`)
- **Benefits**: No version drift, easier maintenance, consistent builds

### **Working with Filtered Commands**

When running commands on specific packages, **always put `--filter` BEFORE the command**:

```bash
# ✓ CORRECT - filter first, then command
pnpm --filter @wpkernel/core build
pnpm --filter @wpkernel/ui test
pnpm --filter @wpkernel/core typecheck

# ✗ WRONG - command first will pass --filter through to package scripts
pnpm build --filter @wpkernel/core      # Causes "Unknown compiler option '--filter'"
pnpm test --filter @wpkernel/ui    # Will fail with unexpected flags
```

**Why this matters:**

- `pnpm build --filter X` runs the **root build script** and appends `--filter X` as an argument
- This causes `--filter` to be passed to package tools (vite, tsc) which don't understand it
- `pnpm --filter X build` correctly **filters the workspace first**, then runs the package's build script

> **📖 See also**: [`information/PNPM_FILTER_COMMANDS.md`](information/PNPM_FILTER_COMMANDS.md) for detailed examples and common patterns

### **Adding Dependencies**

```bash
# Add to root (most cases)
pnpm add -D new-dev-dependency

# Add to specific package (rare)
cd packages/core && pnpm add new-runtime-dep
```

### **Scaffolding a New Workspace**

Use the helper when you spin up a fresh package:

```bash
pnpm monorepo:create packages/awesome-tool --deps=@wpkernel/core
```

The generator creates `package.json`, TypeScript configs, Jest/Vite configs, and smoke tests, then appends the workspace to the root `tsconfig.json` references and keeps `tsconfig.base.json` aliases in sync. From there you can focus on implementation details without worrying about missing the required repo wiring.

Pass `--deps=@wpkernel/core,@wpkernel/ui` (comma separated) when the new workspace should depend on existing packages. The helper adds project references to both TypeScript configs, updates `peerDependencies` with `workspace:*`, and will warn if the requested dependency already points back to your package. Use `pnpm monorepo:update packages/awesome-tool --remove-deps=@wpkernel/ui` to prune relationships later.

### **Peer Dependencies**

Special case: If a package requires specific peer deps (like Vite plugins), add them to both:

1. Root package.json (for hoisting)
2. Consuming package.json (for module resolution)

## 🔧 Build System

### **Watch Mode Development**

```bash
pnpm dev  # Rebuilds packages on file changes
```

**What this does:**

- Watches `packages/*/src/` for changes
- Rebuilds TypeScript + Vite bundles
- Showcase app picks up changes automatically

### **Production Build**

```bash
pnpm build  # One-shot build of all packages
```

**Build order matters:**

1. `packages/core` (core)
2. `packages/ui` (depends on core)
3. `packages/cli` (standalone)
4. `packages/e2e-utils` (standalone)
5. `examples/showcase` (depends on all packages)

## 🎮 WordPress Playground

Alternative to wp-env for quick testing:

```bash
# Online mode (requires network)
pnpm playground

# Offline mode (for CI/restricted networks)
pnpm playground:setup      # Run once: downloads WordPress cache
pnpm playground:offline    # Start in background, uses cache
pnpm playground:offline:stop  # Stop background server
```

**When to use:**

- Quick demos without Docker
- Sharing with non-technical users
- Testing in different environments
- **CI/Docker**: Use offline mode (see `PLAYGROUND_OFFLINE_SETUP.md`)

## 🚨 Common Issues & Solutions

### **"Module not found" errors**

```bash
# Usually means packages aren't built
```

### **E2E tests failing**

```bash
# Ensure WordPress is running with fresh data
pnpm wp:fresh

# Check if ports are available
lsof -i :8888
lsof -i :8889
```

### **"Project chromium not found" error**

E2E tests can be run from any directory:

```bash
# From ROOT directory
cd /Users/jasonnathan/Repos/wp-kernel
pnpm e2e --project chromium

# From showcase directory
cd /Users/jasonnathan/Repos/wp-kernel/examples/showcase
pnpm e2e --project chromium  # Delegates to root config
```

### **"command not found: wp-env"**

```bash
# wp-env should be installed automatically, but if not:
npm install -g @wordpress/env
```

### **Docker issues**

```bash
# Reset everything
pnpm wp:destroy
docker system prune

# Start fresh
pnpm wp:fresh
```

## 📋 Pre-commit Checklist

Before creating a PR, always run:

```bash
# Format code
pnpm format

# Type check everything
pnpm typecheck

# Run all tests
pnpm test
pnpm e2e

# Ensure clean build
pnpm build
```

## 🚢 Release workflow

Releases remain a manual process while we finish the automation work in `RELEASE_PREPARATION.md`. Maintainers should follow the [Framework Release Playbook](docs/releases/framework-release-playbook.md) and rely on the _Release Pack Readiness_ CI job (added in Task 57c) for the publish-order/artefact gate. When cutting a release locally, re-run the same helper with `pnpm --filter @wpkernel/cli exec tsx scripts/check-release-pack-ci.ts` after the usual lint/typecheck/test/build steps. Treat any readiness failure as a blocker and address it in a regular branch before returning to the release cut.

## 🔗 Key Files

| File                         | Purpose                      |
| ---------------------------- | ---------------------------- |
| `.wp-env.json`               | WordPress environment config |
| `playwright.config.ts`       | E2E test configuration       |
| `jest.config.cjs`            | Unit test configuration      |
| `pnpm-workspace.yaml`        | Monorepo package definitions |
| `test-harness/wp-env/seeds/` | Database seeding scripts     |

## 🤖 For Contributors & Agents

**Task execution rules and contribution conventions**: See [`AGENTS.md`](AGENTS.md) for detailed guidelines on:

- Definition of Done (DoD) requirements
- Code review standards
- Coverage expectations
- File size limits
- Commit protocols

> **Note**: `DEVELOPMENT.md` covers environment and workflow only. `AGENTS.md` covers contribution standards and quality gates.

---

**💡 Pro Tip**: Use the VSCode tasks (`Cmd+Shift+P` → "Run Task") for common commands. They're pre-configured and more reliable than remembering all these pnpm scripts!
