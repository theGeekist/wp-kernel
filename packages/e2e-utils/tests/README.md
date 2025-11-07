# E2E Tests Directory

This directory contains end-to-end tests for WPKernel using Playwright.

Tests target the wp-env **tests** site on port 8889.

## Running Tests

```bash
# Run all E2E tests
pnpm e2e

# Run with visible browser
pnpm e2e:headed

# Open Playwright UI
pnpm e2e:ui

# Debug tests
pnpm e2e:debug
```

## Test Structure

Tests use `@wordpress/e2e-test-utils-playwright` for WordPress-specific helpers.

See `playwright.config.ts` for full configuration.
