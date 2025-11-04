[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / createBundler

# Function: createBundler()

```ts
function createBundler(): BuilderHelper;
```

Creates a builder helper for generating bundler configuration and asset manifests.

This helper is responsible for analyzing the project's `package.json`,
determining external dependencies, and generating the necessary configuration
files for a JavaScript bundler (currently Rollup) and a WordPress asset manifest.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance configured to generate bundler artifacts.
