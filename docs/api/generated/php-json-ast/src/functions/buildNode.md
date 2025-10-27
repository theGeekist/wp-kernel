[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildNode

# Function: buildNode()

```ts
function buildNode<T>(nodeType, props, attributes?): T;
```

Generic factory helper for node construction. Prefer dedicated builders
exported alongside the node interfaces, but keep this available for niche
constructs that do not yet have a typed factory.

## Type Parameters

### T

`T` _extends_ [`PhpNode`](../interfaces/PhpNode.md)

## Parameters

### nodeType

`T`\[`"nodeType"`\]

### props

`Omit`\&lt;`T`, `"nodeType"` \| `"attributes"`\&gt;

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

`T`
