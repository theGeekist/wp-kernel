[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildNull

# Function: buildNull()

```ts
function buildNull(attributes?): PhpExprConstFetch;
```

Builds a PHP `null` constant fetch expression.

## Parameters

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprConstFetch`](../interfaces/PhpExprConstFetch.md)

A `PhpExprConstFetch` node representing `null`.
