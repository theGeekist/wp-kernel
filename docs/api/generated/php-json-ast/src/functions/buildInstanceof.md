[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildInstanceof

# Function: buildInstanceof()

```ts
function buildInstanceof(expr, className, attributes?): PhpExprInstanceof;
```

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

### className

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprInstanceof`](../interfaces/PhpExprInstanceof.md)
