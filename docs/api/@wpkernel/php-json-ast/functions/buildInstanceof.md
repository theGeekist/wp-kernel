[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildInstanceof

# Function: buildInstanceof()

```ts
function buildInstanceof(expr, className, attributes?): PhpExprInstanceof;
```

Builds a PHP `instanceof` expression node.

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

The expression to check.

### className

The class name to check against, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprInstanceof`](../interfaces/PhpExprInstanceof.md)

A `PhpExprInstanceof` node.
