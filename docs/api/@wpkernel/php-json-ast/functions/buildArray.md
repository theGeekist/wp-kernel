[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildArray

# Function: buildArray()

```ts
function buildArray(items, attributes?): PhpExprArray;
```

Builds a PHP array expression node.

## Parameters

### items

[`PhpExprArrayItem`](../interfaces/PhpExprArrayItem.md)[]

An array of `PhpExprArrayItem` nodes.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprArray`](../interfaces/PhpExprArray.md)

A `PhpExprArray` node.
