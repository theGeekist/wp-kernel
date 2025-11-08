[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createTsBuilder

# Function: createTsBuilder()

```ts
function createTsBuilder(options): BuilderHelper;
```

Creates a builder helper for generating TypeScript artifacts.

Orchestrates:

- Admin screens under `.generated/ui/app/...`
- DataView fixtures under `.generated/ui/fixtures/dataviews/...`
- Interactivity fixtures under `.generated/ui/fixtures/interactivity/...`
- Registry metadata under `.generated/ui/registry/dataviews/...`

## Parameters

### options

[`CreateTsBuilderOptions`](../interfaces/CreateTsBuilderOptions.md) = `{}`

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance configured to generate TypeScript artifacts.

## Example

```ts
const builder = createTsBuilder();
await builder.apply({ context, input, output, reporter }, undefined);
```
