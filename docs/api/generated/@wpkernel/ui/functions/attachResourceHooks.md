[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / attachResourceHooks

# Function: attachResourceHooks()

```ts
function attachResourceHooks<T, TQuery>(
	resource,
	_runtime?
): ResourceObject<T, TQuery>;
```

Attach `useGet` and `useList` React helpers to a resource definition.

The hooks wrap `@wordpress/data.useSelect()` to expose resource data with
loading and error states that mirror resolver status. They are registered on
demand when the UI bundle is evaluated so resource modules remain tree-shake
friendly for non-React contexts.

## Type Parameters

### T

`T`

Entity type

### TQuery

`TQuery`

Query parameter type

## Parameters

### resource

[`ResourceObject`](../../../core/src/type-aliases/ResourceObject.md)\&lt;`T`, `TQuery`\&gt;

Resource definition to augment with hooks

### \_runtime?

[`KernelUIRuntime`](../../../core/src/@wpkernel/core/data/interfaces/KernelUIRuntime.md)

Active Kernel UI runtime (unused placeholder for API symmetry)

## Returns

[`ResourceObject`](../../../core/src/type-aliases/ResourceObject.md)\&lt;`T`, `TQuery`\&gt;

The same resource object with hooks attached
