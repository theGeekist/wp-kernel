# pnpm Scripts Reference

Complete reference for all npm scripts in the WP Kernel monorepo.

## Root Package Scripts

All scripts run from the root directory unless otherwise specified.

### Development

```bash
# Watch all packages in parallel (TypeScript compilation)
pnpm dev

# Watch specific package
pnpm --filter @geekist/wp-kernel dev
pnpm --filter @geekist/wp-kernel-ui dev
pnpm --filter @geekist/wp-kernel-cli dev
pnpm --filter @geekist/wp-kernel-e2e-utils dev

# Watch showcase plugin (webpack)
pnpm --filter wp-kernel-showcase dev
```

### Build

```bash
# Build everything (packages + examples)
pnpm build

# Build only packages
pnpm build:packages

# Build only examples
pnpm build:examples

# Build specific package
pnpm --filter @geekist/wp-kernel build
pnpm --filter @geekist/wp-kernel-ui build
pnpm --filter wp-kernel-showcase build
```

### Clean

```bash
# Remove all dist folders and root node_modules
pnpm clean

# Remove only dist folders (keep node_modules)
pnpm clean:dist

# Clean specific package
pnpm --filter @geekist/wp-kernel clean
```

### Linting & Formatting

```bash
# Lint all files
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format all files
pnpm format

# Check formatting (CI)
pnpm format:check

# Type check all packages
pnpm typecheck
```

### Testing

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm e2e

# Run E2E tests with browser visible
pnpm e2e:headed

# Open Playwright test UI
pnpm e2e:ui

# Debug E2E tests
pnpm e2e:debug
```

### WordPress Environment

```bash
# Start WordPress (dev: 8888, tests: 8889)
pnpm wp:start

# Stop WordPress
pnpm wp:stop

# Restart WordPress
pnpm wp:restart

# Destroy containers
pnpm wp:destroy

# Destroy containers and clean .wp-env cache
pnpm wp:clean

# Run WP-CLI command (pass arguments directly)
pnpm wp:cli wp plugin list
pnpm wp:cli wp user list
pnpm wp:cli wp eval "echo WP_DEBUG;"

# View logs
pnpm wp:logs           # All logs
pnpm wp:logs:php       # PHP logs only

# Seed database
pnpm wp:seed

# Reset and re-seed
pnpm wp:seed:reset

# Fresh start (start + seed)
pnpm wp:fresh
```

### WordPress Playground

```bash
# Start WordPress Playground (WASM-based)
pnpm playground
```

### Changesets (Version Management)

```bash
# Add a changeset
pnpm changeset

# Version packages
pnpm changeset:version

# Publish packages
pnpm changeset:publish
```

## Package-Specific Scripts

### @geekist/wp-kernel (packages/kernel)

```bash
cd packages/kernel

# Watch TypeScript compilation
pnpm dev

# Build once
pnpm build

# Clean dist
pnpm clean

# Type check only (no emit)
pnpm typecheck
```

### @geekist/wp-kernel-ui (packages/ui)

```bash
cd packages/ui

# Watch TypeScript compilation
pnpm dev

# Build once
pnpm build

# Clean dist
pnpm clean

# Type check only
pnpm typecheck
```

### @geekist/wp-kernel-cli (packages/cli)

```bash
cd packages/cli

# Watch TypeScript compilation
pnpm dev

# Build once
pnpm build

# Clean dist
pnpm clean

# Type check only
pnpm typecheck

# Run CLI (after build)
node bin/wpk.js --help
```

### @geekist/wp-kernel-e2e-utils (packages/e2e-utils)

```bash
cd packages/e2e-utils

# Watch TypeScript compilation
pnpm dev

# Build once
pnpm build

# Clean dist
pnpm clean

# Type check only
pnpm typecheck
```

### wp-kernel-showcase (examples/showcase-plugin)

```bash
cd examples/showcase-plugin

# Watch with webpack (hot reload)
pnpm dev

# Build for production
pnpm build

# Clean build directory
pnpm clean
```

## pnpm Workspace Patterns

### Filter Patterns

```bash
# Run in specific package
pnpm --filter @geekist/wp-kernel <command>

# Run in all packages
pnpm --filter './packages/*' <command>

# Run in all examples
pnpm --filter './examples/*' <command>

# Run in multiple packages
pnpm --filter '@geekist/wp-kernel' --filter '@geekist/wp-kernel-ui' build

# Run recursively (all workspaces)
pnpm -r <command>
pnpm --recursive <command>
```

### Parallel Execution

```bash
# Run in parallel
pnpm --parallel <command>

# Example: Watch all packages in parallel
pnpm --filter './packages/*' --parallel run dev
```

### Topological Order

```bash
# Respect dependency order (default for most commands)
pnpm -r build

# Example: Build packages before examples
pnpm --filter './packages/*' build
pnpm --filter './examples/*' build
```

## Common Workflows

### First-Time Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start WordPress
pnpm wp:start

# In another terminal, watch for changes
pnpm dev
```

### Daily Development

```bash
# Terminal 1: Watch packages
pnpm dev

# Terminal 2: Watch plugin
pnpm --filter wp-kernel-showcase dev

# Terminal 3: WordPress environment
pnpm wp:start
```

### Before Commit

```bash
# Check types
pnpm typecheck

# Lint and fix
pnpm lint:fix

# Format code
pnpm format

# Run tests
pnpm test

# Build everything
pnpm build
```

### CI/CD Workflow

```bash
# Install (frozen lockfile)
pnpm install --frozen-lockfile

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format check
pnpm format:check

# Unit tests
pnpm test

# Build
pnpm build

# E2E tests (requires wp-env)
pnpm wp:start
pnpm e2e
```

### Debugging

```bash
# Check which packages pnpm sees
pnpm -r exec pwd

# List all dependencies
pnpm list --depth=0

# List package dependencies
pnpm --filter @geekist/wp-kernel list

# Check outdated packages
pnpm outdated

# Audit dependencies
pnpm audit
```

### Clean Slate

```bash
# Nuclear option: Remove everything and reinstall
pnpm clean
rm -rf pnpm-lock.yaml
pnpm install
pnpm build
```

## Environment Variables

### Development

```bash
# Enable debug logging
DEBUG=* pnpm dev

# Node memory limit (for large projects)
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### WordPress

```bash
# Use specific WordPress version
WP_VERSION=6.6 pnpm wp:start

# Use specific PHP version (not supported by wp-env config)
# Edit .wp-env.json instead
```

## Troubleshooting

### "Command not found: wp-env"

```bash
# Ensure dependencies are installed
pnpm install

# wp-env is in devDependencies, use pnpm script
pnpm wp:start  # ✓ Works
wp-env start   # ✗ Doesn't work (not in PATH)
```

### "Module not found" errors

```bash
# Rebuild all packages
pnpm clean:dist
pnpm build

# Or install + rebuild
pnpm install
pnpm build
```

### "Port already in use"

```bash
# Check what's running
lsof -i :8888

# Stop WordPress
pnpm wp:stop

# Or kill the process
kill -9 <PID>
```

### TypeScript errors after pulling

```bash
# Reinstall dependencies
pnpm install

# Rebuild packages
pnpm build

# Clean TypeScript cache
pnpm -r exec rm -f tsconfig.tsbuildinfo
pnpm build
```

### pnpm workspace not finding packages

```bash
# Check workspace configuration
cat pnpm-workspace.yaml

# Should contain:
# packages:
#   - 'packages/*'
#   - 'examples/*'

# Verify package.json has correct name
cat packages/kernel/package.json | grep name
```

## Performance Tips

1. **Use filters**: Don't run commands on all packages if you only need one

    ```bash
    pnpm --filter @geekist/wp-kernel build  # Fast
    pnpm -r build                            # Slower
    ```

2. **Parallel builds**: Use `--parallel` for independent packages

    ```bash
    pnpm --filter './packages/*' --parallel run dev
    ```

3. **Incremental builds**: TypeScript composite projects enable incremental compilation
    - Keep `tsconfig.tsbuildinfo` files (they're gitignored but cached locally)
    - Don't clean unless necessary

4. **Workspace protocol**: Use `workspace:*` for internal dependencies
    - Avoids installing from registry
    - Uses local symlinks

5. **Selective installs**: Install only what you need
    ```bash
    pnpm --filter @geekist/wp-kernel install
    ```

## Script Naming Conventions

- `dev` - Watch mode (continuous compilation)
- `build` - One-time production build
- `clean` - Remove build artifacts
- `typecheck` - Type check without emitting files
- `test` - Run tests once
- `test:watch` - Run tests in watch mode
- `test:coverage` - Run tests with coverage report
- `lint` - Check for linting errors
- `lint:fix` - Fix linting errors automatically
- `format` - Format code
- `format:check` - Check if code is formatted (CI)

## VS Code Integration

All these scripts are available as VS Code tasks. See `.vscode/tasks.json`.

To run a task:

1. `Cmd+Shift+P` → "Tasks: Run Task"
2. Select task from list

Common tasks have keyboard shortcuts:

- `Cmd+Shift+B` - Build All (default build task)
