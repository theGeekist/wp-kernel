[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / createPhpBuilder

# Function: createPhpBuilder()

```ts
function createPhpBuilder(options): BuilderHelper;
```

Creates a builder helper for generating PHP code and artifacts.

This helper orchestrates a sequence of other PHP-specific helpers to generate
various components of the PHP output, such as controllers, storage implementations,
capability definitions, and the main plugin loader file.

## Parameters

### options

[`CreatePhpBuilderOptions`](../interfaces/CreatePhpBuilderOptions.md) = `{}`

Configuration options for the PHP builder.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance configured to generate PHP artifacts.
