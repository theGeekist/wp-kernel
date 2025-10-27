[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildScalarCast

# Function: buildScalarCast()

```ts
function buildScalarCast(kind, expr, attributes?): PhpExprCastScalar;
```

## Parameters

### kind

`"string"` | `"int"` | `"float"` | `"bool"`

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprCastScalar`](../type-aliases/PhpExprCastScalar.md)
