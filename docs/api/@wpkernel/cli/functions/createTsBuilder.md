[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createTsBuilder

# Function: createTsBuilder()

```ts
function createTsBuilder(options): BuilderHelper;
```

Creates a builder helper for generating TypeScript artifacts.

Orchestrates:

- Admin screens under `.wpk/generate/ui/app/...`
- DataView fixtures under `.wpk/generate/ui/fixtures/dataviews/...`
- Interactivity fixtures under `.wpk/generate/ui/fixtures/interactivity/...`
- Registry metadata under `.wpk/generate/ui/registry/dataviews/...`

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
