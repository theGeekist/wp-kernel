[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildIfStatement

# Function: buildIfStatement()

```ts
function buildIfStatement(cond, stmts, options, attributes?): PhpStmtIf;
```

## Parameters

### cond

[`PhpExpr`](../type-aliases/PhpExpr.md)

### stmts

[`PhpStmt`](../type-aliases/PhpStmt.md)[]

### options

#### elseifs?

[`PhpStmtElseIf`](../interfaces/PhpStmtElseIf.md)[]

#### elseBranch?

[`PhpStmtElse`](../interfaces/PhpStmtElse.md) \| `null`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtIf`](../interfaces/PhpStmtIf.md)
