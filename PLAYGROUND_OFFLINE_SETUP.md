# WordPress Playground Offline Setup

## Quick Start (CI/Docker)

After `pnpm install`, run:

```bash
# Install Playwright browsers (required for e2e tests)
pnpm exec playwright install --with-deps chromium

# Pre-download WordPress cache
pnpm playground:setup

# Start server (zero network, runs in background)
pnpm playground:offline
```

Server runs at `http://127.0.0.1:9400`. Stop with `pnpm playground:offline:stop`.

---

## Problem

When running `pnpm playground` in CI/Docker environments with restricted network access, the Playground CLI attempts to fetch:

1. **WordPress ZIP files** from `wordpress.org/wordpress-{version}.zip`
2. **Plugin/theme files** from `downloads.wordpress.org` (if referenced in blueprints)
3. **Translations** from `api.wordpress.org` and `downloads.wordpress.org`

Even with domain whitelisting, these fetches can fail due to proxy configurations, firewall rules, or CORS policies.

## Solution: Pre-Download & Mount Strategy

The Playground CLI supports `--skip-wordpress-setup` and `--mount-before-install` flags, allowing you to:

1. **Pre-download WordPress** before the container starts (when you have full internet access)
2. **Mount the pre-configured WordPress directory** instead of letting Playground download it
3. **Avoid all network fetches** during Playground startup

## What Gets Pre-Downloaded

### Already Bundled (No Download Needed)

✓ **PHP WASM binaries** - Bundled in `@php-wasm/node` package at install time

- Located: `node_modules/.pnpm/@php-wasm+node@{version}/node_modules/@php-wasm/node/jspi/`
- Versions: 7.2, 7.3, 7.4, 8.0, 8.1, 8.2, 8.3, 8.4
- Size: ~25MB per version

### Needs Pre-Download

✗ **WordPress core** - Downloaded from `wordpress.org`

- URL: `https://wordpress.org/wordpress-{version}.zip`
- Size: ~20-30MB per version
- **Solution**: Pre-download and extract before container run

✗ **SQLite Integration Plugin** - Required for Playground (no MySQL)

- URL: `https://downloads.wordpress.org/plugin/sqlite-database-integration.{version}.zip`
- **Solution**: Pre-download and install into WordPress wp-content/plugins

✗ **Additional Plugins/Themes** (if referenced in blueprint)

- **Solution**: Use local mounts instead of `resource: "wordpress.org/..."` in blueprint

## Implementation

### 1. Pre-Download Script

We've created `scripts/offline-playground-setup.sh`:

```bash
# Downloads WordPress, extracts it, installs SQLite plugin
./scripts/offline-playground-setup.sh
```

This creates a complete WordPress installation in `test-harness/playground-cache/wordpress/`.

### 2. Update Blueprint

Modify `test-harness/playground/blueprint.json` to use the mounted WordPress:

```json
{
	"$schema": "https://playground.wordpress.net/blueprint-schema.json",
	"landingPage": "/wp-admin/",
	"preferredVersions": {
		"php": "8.3",
		"wp": "6.7.4"
	},
	"features": {
		"networking": false
	},
	"steps": [
		{
			"step": "defineWpConfigConsts",
			"consts": {
				"WP_DEBUG": true,
				"WP_DEBUG_LOG": true,
				"WP_DEBUG_DISPLAY": false
			}
		},
		{
			"step": "setSiteOptions",
			"options": {
				"permalink_structure": "/%postname%/"
			}
		},
		{
			"step": "activatePlugin",
			"pluginPath": "showcase-plugin/showcase-plugin.php"
		}
	]
}
```

**Key Changes**:

- Set `"networking": false` to disable network access
- Remove any `installPlugin`/`installTheme` steps that fetch from wordpress.org
- Use local mounts for your plugins

### 3. Update package.json Script

Replace the `playground` script with:

```json
{
	"scripts": {
		"playground:online": "wp-playground-cli server --blueprint=./test-harness/playground/blueprint.json --mount=./examples/showcase:/wordpress/wp-content/plugins/showcase-plugin --port=9400",
		"playground:offline": "wp-playground-cli server --skip-wordpress-setup --mount-before-install=./test-harness/playground-cache/wordpress:/wordpress --mount=./examples/showcase:/wordpress/wp-content/plugins/showcase-plugin --blueprint=./test-harness/playground/blueprint-offline.json --port=9400",
		"playground:setup": "bash scripts/offline-playground-setup.sh",
		"playground": "npm-run-all --silent playground:setup playground:offline"
	}
}
```

### 4. CI/Docker Integration

In your CI pipeline or Dockerfile:

```bash
# During image build (full internet access)
RUN pnpm install
RUN pnpm playground:setup

# During test run (restricted network)
CMD ["pnpm", "playground:offline"]
```

## Directory Structure

```
test-harness/
  playground/
    blueprint.json              # Original (requires network)
    blueprint-offline.json      # Offline version (no network)
  playground-cache/            # Created by setup script
    wordpress/                 # Pre-configured WordPress
      wp-admin/
      wp-content/
        plugins/
          sqlite-database-integration/
      wp-includes/
      ...
    wordpress-6.7.4.zip       # Downloaded ZIP (can be deleted after extract)
```

## Network Requirements by Phase

### Phase 1: Setup (Full Internet Access Required)

```bash
pnpm playground:setup
```

**Domains needed**:

- ✓ `wordpress.org` - WordPress core download
- ✓ `downloads.wordpress.org` - Plugins/themes
- ✓ `npmjs.com` / `registry.npmjs.org` - npm packages (if not already installed)

### Phase 2: Runtime (Zero Network Access)

```bash
pnpm playground:offline
```

**Domains needed**: NONE

All assets loaded from:

- PHP binaries: `node_modules/@php-wasm/node/`
- WordPress: `test-harness/playground-cache/wordpress/`
- Your plugin: `examples/showcase/` (mounted)

## Testing the Offline Setup

### Test 1: Verify Cache

```bash
pnpm playground:setup
ls -la test-harness/playground-cache/wordpress/
# Should show full WordPress installation
```

### Test 2: Test Offline Mode

```bash
# Disable network to simulate CI environment
sudo ifconfig en0 down  # macOS
# or
sudo ip link set eth0 down  # Linux

# Try running offline playground
pnpm playground:offline

# Re-enable network
sudo ifconfig en0 up  # macOS
# or
sudo ip link set eth0 up  # Linux
```

### Test 3: Verify No Network Requests

```bash
# Run with network monitoring
tcpdump -i any host wordpress.org or host downloads.wordpress.org &
pnpm playground:offline
# Should show NO packets to wordpress.org
```

## Troubleshooting

### Issue: "WordPress not found"

**Cause**: WordPress wasn't properly extracted or mounted

**Fix**:

```bash
rm -rf test-harness/playground-cache
pnpm playground:setup
```

### Issue: "SQLite plugin missing"

**Cause**: Playground requires SQLite integration for database

**Fix**: Ensure `scripts/offline-playground-setup.sh` includes SQLite plugin download

### Issue: "Plugin not activated"

**Cause**: Blueprint trying to activate before plugin is mounted

**Fix**: Ensure `--mount-before-install` is used for WordPress, regular `--mount` for your plugin

## Alternative: Build a Playground Snapshot

For ultimate offline control, build a complete snapshot:

```bash
wp-playground-cli build-snapshot \
  --blueprint=./test-harness/playground/blueprint.json \
  --mount=./examples/showcase:/wordpress/wp-content/plugins/showcase-plugin \
  --outfile=test-harness/playground-cache/wordpress-snapshot.zip

# Then use it:
wp-playground-cli server \
  --skip-wordpress-setup \
  --mount-before-install=./test-harness/playground-cache/wordpress-snapshot.zip:/wordpress \
  --port=9400
```

This creates a single ZIP with everything pre-configured.

## Benefits

✓ **Zero runtime network dependencies** - No fetch failures in CI
✓ **Faster startup** - No download/extraction during Playground boot
✓ **Deterministic builds** - Same WordPress version every time
✓ **Offline development** - Work without internet
✓ **CI/Docker friendly** - Build once, run anywhere

## References

- [Playground CLI Documentation](https://wordpress.github.io/wordpress-playground/developers/local-development/wp-playground-cli/)
- [Blueprint Schema](https://playground.wordpress.net/blueprint-schema.json)
- [WordPress Playground GitHub](https://github.com/WordPress/wordpress-playground)
