[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildNode

# Function: buildNode()

```ts
function buildNode&lt;T&gt;(
   nodeType,
   props,
   attributes?): T;
```

Generic factory helper for PHP AST node construction.

Prefer dedicated builders exported alongside the node interfaces for specific node types.
Use this generic builder for niche constructs that do not yet have a typed factory.

## Type Parameters

### T

`T` _extends_ [`PhpNode`](../interfaces/PhpNode.md)

## Parameters

### nodeType

`T`\[`"nodeType"`\]

The type of the PHP AST node.

### props

`Omit`\&lt;`T`, `"nodeType"` \| `"attributes"`\&gt;

The properties of the node, excluding `nodeType` and `attributes`.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

`T`

A new PHP AST node of the specified type.
