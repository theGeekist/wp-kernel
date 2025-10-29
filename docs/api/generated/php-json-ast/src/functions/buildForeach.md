[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildForeach

# Function: buildForeach()

```ts
function buildForeach(expr, options, attributes?): PhpStmtForeach;
```

## Parameters

### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

### options

#### valueVar

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### keyVar?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### byRef?

`boolean`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtForeach`](../interfaces/PhpStmtForeach.md)
