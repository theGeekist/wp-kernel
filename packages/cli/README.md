# @geekist/wp-kernel-cli

> Rails-like generators and development tools for WP Kernel projects

## Overview

Command-line tools that accelerate WordPress development with kernel patterns:

- **Project scaffolding** - Complete plugin/theme setup with build tooling
- **Code generators** - Resources, actions, admin interfaces, and tests
- **Development server** - Hot reload with wp-env integration
- **Custom templates** - Reusable patterns for your organization

Gets you from idea to working WordPress plugin in minutes.

## Quick Start

```bash
# Global installation
npm install -g @geekist/wp-kernel-cli

# Create new plugin
wpk init my-plugin --template=plugin

# Generate complete CRUD feature
wpk generate feature Job --with=resource,admin-table,actions,tests

# Start development
wpk dev
```

## Key Commands

**📖 [Complete Documentation →](../../docs/packages/cli.md)**

### Project Setup

```bash
wpk init my-plugin --template=plugin    # WordPress plugin
wpk init my-theme --template=theme      # Block theme
wpk init my-app --template=headless     # Headless WordPress
```

### Code Generation

```bash
# Individual components
wpk generate resource Post              # Resource definition
wpk generate action CreatePost          # Action orchestrator
wpk generate admin-page PostsList       # DataViews admin table

# Complete features
wpk generate feature Job \
  --with=resource,admin-table,actions,tests,php-bridge
```

### Development

```bash
wpk dev                                 # Start dev server + wp-env
wpk build                              # Production build
wpk test                               # Run tests + typecheck
```

## Template System

```bash
# Use built-in templates
wpk generate feature User --template=crud-complete

# Create custom templates
wpk template create my-feature-template

# Organization templates
wpk config set template-repo github:my-org/wpk-templates
```

**🚀 [Generator Patterns →](../../docs/packages/cli.md#advanced-generator-patterns)**
wpk generate view PostList # Create view component
wpk generate job SendEmail # Create background job

# Development tools

wpk typecheck # Validate TypeScript
wpk test # Run test suite
wpk package # Create distribution zip

```

## Documentation

- **[Complete Documentation](https://thegeekist.github.io/wp-kernel/packages/cli/)** - All commands and options
- **[Getting Started](https://thegeekist.github.io/wp-kernel/getting-started/)** - Project setup guide
- **[Generators Guide](https://thegeekist.github.io/wp-kernel/guide/generators/)** - Using and customizing generators

## Development Status

- ✅ Project initialization templates
- ✅ Core generator architecture
- 🚧 Resource and action generators in progress
- 🚧 Build and deployment tools planned

## Requirements

- Node.js 22+
- pnpm (recommended) or npm

## Documentation

For complete documentation, see the [main repository](https://github.com/theGeekist/wp-kernel).

## License

MIT © [The Geekist](https://github.com/theGeekist)
```
