[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / createSchemasFragment

# Function: createSchemasFragment()

```ts
function createSchemasFragment(): IrFragment;
```

Creates an IR fragment that processes and accumulates schema definitions.

This fragment loads schemas configured in the `wpk.config.*` file and makes
them available in the Intermediate Representation.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)

An `IrFragment` instance for schema processing.
