# Test Harness - E2E Testing Environments

Two environments available: **wp-env** (Docker, default) or **Playground** (faster, no Docker).

**Both environments are automatically configured with pretty permalinks for REST API access.**

## Quick Start

### wp-env (Default)

```bash
pnpm wp:start         # Starts wp-env and configures permalinks
pnpm e2e              # Run tests
```

The `wp:start` command now includes automatic setup that:

- Sets pretty permalinks (`/%postname%/`)
- Flushes rewrite rules
- Verifies REST API accessibility

### Playground (Faster)

```bash
# Online mode (requires network):
# Terminal 1 - Start server:
pnpm playground

# Terminal 2 - Run tests (after "WordPress is running" message):
pnpm e2e:playground

# Offline mode (for CI/restricted networks):
pnpm playground:setup    # Run once: downloads WordPress cache (requires network)
pnpm playground:offline  # Start in background, zero network required
pnpm e2e:playground      # Run tests
pnpm playground:offline:stop  # Stop server
```

Playground is configured via `test-harness/playground/blueprint.json` (online) or `blueprint-offline.json` (offline).

**For CI/Docker:** Use offline mode. See `PLAYGROUND_OFFLINE_SETUP.md` for details.

## Available Commands

```bash
# wp-env (default)
pnpm wp:start            # Start wp-env + configure permalinks
pnpm wp:setup            # Re-run permalink setup (if needed)
pnpm e2e                 # Run all tests
pnpm e2e:headed          # Run with visible browser
pnpm e2e:ui              # Open Playwright UI
pnpm e2e:debug           # Debug mode

# Playground (add :playground to any command)
pnpm e2e:playground
pnpm e2e:playground:ui
pnpm e2e:playground:debug
```

## Troubleshooting

**REST API returns 404**

Both environments require pretty permalinks for `/wp-json/` to work:

- **wp-env**: Run `pnpm wp:setup` to reconfigure
- **Playground**: Restart server (`pnpm playground`)

**Tests behave differently between environments**

The test results should be **identical** between wp-env and Playground. If they're not:

1. Check that both have permalinks enabled (`curl -I http://localhost:8889/wp-json/` should return 200)
2. Verify plugin is activated in both environments
3. Restart both environments fresh and compare

**Known test failures (both environments)**

Some tests currently fail in both environments - these are bugs in the test suite, not environment issues:

- "seeds and removes a single job" - deletion doesn't properly remove items
- Several tests interrupted with "page closed" errors

**"Timed out waiting from config.webServer"**

- You forgot to start Playground manually in Terminal 1

**Port already in use**

```bash
lsof -i :9400           # Check what's using the port
kill -9 <PID>           # Kill it
```

## Configuration

- **wp-env**: Port 8889, config in `.wp-env.json`
- **Playground**: Port 9400, config in `test-harness/playground/blueprint.json`

## Why Use Playground?

- 10x faster startup (~30s vs 2+ minutes)
- No Docker required
- Perfect for rapid test development

Use wp-env for final checks before commits.
