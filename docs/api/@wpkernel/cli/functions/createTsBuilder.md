[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / createTsBuilder

# Function: createTsBuilder()

```ts
function createTsBuilder(options): BuilderHelper;
```

Creates a builder helper for generating TypeScript artifacts.

This helper orchestrates the generation of various TypeScript files,
such as admin screens and dataview fixtures, based on the project's IR.
It uses `ts-morph` for programmatic TypeScript code generation and formatting.

## Parameters

### options

[`CreateTsBuilderOptions`](../interfaces/CreateTsBuilderOptions.md) = `{}`

Options for configuring the TypeScript builder.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance configured to generate TypeScript artifacts.
