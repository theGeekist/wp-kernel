[**WP Kernel API v0.10.0**](../../../README.md)

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

#### byRef?

`boolean`

#### keyVar?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

#### valueVar

[`PhpExpr`](../type-aliases/PhpExpr.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtForeach`](../interfaces/PhpStmtForeach.md)
