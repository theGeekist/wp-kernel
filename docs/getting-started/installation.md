# Installation

This guide covers setting up a development environment for WP Kernel.

## Prerequisites

Before you begin, make sure you have:

- **Node.js**: v22.20.0 LTS ([nvm recommended](https://github.com/nvm-sh/nvm))
- **pnpm**: v9.12.3 or later (`npm install -g pnpm`)
- **Docker**: For local WordPress environment ([Docker Desktop](https://www.docker.com/products/docker-desktop))
- **Git**: For version control

### Verify Prerequisites

```bash
node --version  # Should show v22.20.0 or compatible LTS
pnpm --version  # Should show 9.12.3 or later
docker --version # Should show Docker version 20.10+
```

## Clone the Repository

```bash
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel
```

## Install Dependencies

WP Kernel uses a pnpm workspace monorepo:

```bash
pnpm install
```

This installs dependencies for:

- Core packages (`@geekist/wp-kernel`, `@geekist/wp-kernel-ui`)
- E2E testing utilities
- Example showcase plugin
- Development tooling

## Start WordPress Environment

WP Kernel includes two WordPress environments:

- **Development** (localhost:8888) - For manual testing and development
- **Testing** (localhost:8889) - For E2E tests with clean fixtures

### Quick Start (Recommended)

Start WordPress with seed data:

```bash
pnpm wp:fresh
```

This command:

1. Starts Docker containers (wp-env)
2. Seeds test data (users, applications, jobs)
3. Activates the showcase plugin

### Access WordPress

- **Development Site**: http://localhost:8888
- **Admin Dashboard**: http://localhost:8888/wp-admin
- **Default Credentials**: `admin` / `password`

## Build Packages

Build all packages in watch mode:

```bash
pnpm dev
```

Or build once for production:

```bash
pnpm build
```

## Run Tests

### Unit Tests

```bash
pnpm test
```

With coverage:

```bash
pnpm test:coverage
```

### E2E Tests

Make sure WordPress is running first (`pnpm wp:start`), then:

```bash
pnpm e2e
```

E2E tests run against localhost:8889 (testing environment).

## Verify Installation

After installation, verify everything works:

1. **Build succeeds**: `pnpm build` (should complete without errors)
2. **Lint passes**: `pnpm lint` (should show zero errors)
3. **Tests pass**: `pnpm test` (should show all tests passing)
4. **WordPress loads**: Visit http://localhost:8888
5. **Showcase plugin active**: Check wp-admin → Plugins

## Development Workflow

Typical development workflow:

```bash
# Terminal 1: Watch build
pnpm dev

# Terminal 2: WordPress environment
pnpm wp:start

# Terminal 3: Run tests as you code
pnpm test --watch
```

## Alternative: WordPress Playground

For quick demos without Docker:

```bash
pnpm playground
```

This launches WordPress in a WebAssembly environment (no installation required).

## Troubleshooting

### Port Conflicts

If ports 8888 or 8889 are in use:

```bash
# Stop wp-env
pnpm wp:stop

# Check what's using the port
lsof -i :8888
```

### Docker Issues

```bash
# Reset wp-env completely
pnpm wp:destroy
pnpm wp:fresh
```

### Build Errors

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Seed Data Not Loading

```bash
# Re-seed manually
pnpm wp:seed
```

## Next Steps

Now that your environment is set up:

- [Quick Start Guide](/getting-started/quick-start) - Build your first feature
- [Development Runbook](/contributing/runbook) - Common development tasks
- [Core Concepts](/guide/) - Understand the framework architecture
