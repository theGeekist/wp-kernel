ONBOARDING — WP Kernel

Quick, copyable setup for a new developer on macOS (zsh). This document shows everything needed to set up the project, including Docker.

## Prerequisites

- macOS (modern release)
- Homebrew (recommended)

1. Install Homebrew (if you don't already):

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Install Docker Desktop

- Download Docker Desktop for macOS from https://www.docker.com/products/docker-desktop and install it.
- Start Docker Desktop and allow system permissions when prompted.

Verify Docker is running:

```bash
docker --version
docker info
```

If you prefer CLI-only + container runtime (Linux/Windows WSL), adapt accordingly.

## Node & pnpm

We use Node 22.x LTS and pnpm for the monorepo.

1. Install nvm (Node version manager):

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
# restart your shell or source nvm
```

2. Install and use Node 22:

```bash
nvm install 22
nvm use 22
node -v
```

3. Install pnpm globally:

```bash
npm install -g pnpm
pnpm -v
```

## Clone & bootstrap

```bash
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel
nvm use 22
pnpm install
```

## Build & typecheck

```bash
pnpm -r build
pnpm typecheck
pnpm typecheck:tests
```

## Start WordPress (wp-env)

Start the local WordPress environment (Docker) and seed the showcase plugin data.

```bash
# Start wp-env (creates containers if not present)
pnpm wp:start

# Fast reset the DB and run seeding (recommended for tests)
pnpm wp:seed:reset

# Alternatively, full fresh start (start + seed)
pnpm wp:fresh

# If containers misbehave:
pnpm wp:destroy
pnpm wp:fresh
```

## Dev watch & run

```bash
# Watch all packages (dev mode)
pnpm dev

# Watch only showcase (faster during UI dev)
pnpm --filter wp-kernel-showcase dev
```

## Tests

Unit tests:

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

E2E tests (Playwright):
Make sure Docker is running and WordPress is started & seeded.

```bash
# Run all e2e tests in headed Chromium
pnpm e2e --project=chromium --headed

# Run a focused test (grep example)
pnpm e2e --grep "create.*job.*table" --project=chromium --headed
```

If Playwright needs additional browsers:

```bash
pnpm dlx playwright install --with-deps
```

## Docs

Build the docs locally:

```bash
pnpm docs:build
```

## Housekeeping

```bash
# Format & lint
pnpm lint --fix
pnpm format

# Clean node_modules and reinstall
rm -rf node_modules packages/*/node_modules app/*/node_modules
pnpm install
```

## Troubleshooting tips

- If e2e tests fail due to stale WP state, run:
    - `pnpm wp:seed:reset` (fast)
    - If still failing: `pnpm wp:destroy && pnpm wp:fresh`
- If Playwright complains about missing browsers, run the playwright install command above.

## Contact

If anything here fails, check the project `README.md` and `DEVELOPMENT.md` in the repository root, or reach out to the maintainers.
