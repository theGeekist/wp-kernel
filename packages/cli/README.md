# @geekist/wp-kernel-cli

> Rails-like generators and development tools for WP Kernel projects (Sprint 7 - Planned)

## Overview

Command-line tools that will accelerate WordPress development with kernel patterns:

- **Project scaffolding** - Complete plugin/theme setup with build tooling
- **Code generators** - Resources, actions, admin interfaces, and tests
- **Development server** - Hot reload with wp-env integration
- **Custom templates** - Reusable patterns for your organization

**Status**: 🚧 **Planned for Sprint 7** - CLI architecture designed, implementation in progress

## Planned Features

**📖 [CLI Strategy Document](../../information/CLI%20&%20Build%20Tooling%20Strategy.md)**

### Project Setup (Planned)

```bash
wpk init my-plugin --template=plugin    # WordPress plugin
wpk init my-theme --template=theme      # Block theme
wpk init my-app --template=headless     # Headless WordPress
```

### Code Generation (Planned)

```bash
# Individual components
wpk generate resource Post              # Resource definition
wpk generate action CreatePost          # Action orchestrator
wpk generate admin-page PostsList       # DataViews admin table

# Complete features
wpk generate feature Job \
  --with=resource,admin-table,actions,tests,php-bridge
```

### Development Tools (Planned)

```bash
wpk dev                                 # Start dev server + wp-env
wpk build                              # Production build
wpk test                               # Run tests + typecheck
```

## Current Status

- ✓ CLI architecture designed
- ✓ Template system specification complete
- 🚧 Core generator implementation
- ⏳ Integration with build tooling (Vite 7)
- ⏳ WordPress-specific generators

**Available Now**: Use manual scaffolding via `@wordpress/create-block` and WP Kernel's documented patterns

## Documentation

- **[Getting Started](https://thegeekist.github.io/wp-kernel/getting-started/)** - Manual project setup (current approach)
- **[CLI Strategy](../../information/CLI%20&%20Build%20Tooling%20Strategy.md)** - Planned features and architecture

## Requirements

- **Node.js**: 20+ LTS
- **pnpm**: 9+ (recommended) or npm

## Adapter extensions

Adapters can register extension factories to participate in the generation pipeline without mutating `.generated/` directly. Each extension runs inside an isolated sandbox; queued files are only written after the core printers succeed.

```ts
module.exports = {
	// ...kernel.config.js contents
	adapters: {
		extensions: [
			({ namespace, reporter }) => ({
				name: 'telemetry',
				async apply({ queueFile, outputDir }) {
					const path = require('node:path');
					await queueFile(
						path.join(outputDir, 'telemetry.json'),
						JSON.stringify({ namespace })
					);
					reporter.info('Telemetry manifest generated.');
				},
			}),
		],
	},
};
```

Extensions can also call `updateIr(nextIr)` to feed changes back into the printers while keeping the configuration as the single source of truth.

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)

```

```
