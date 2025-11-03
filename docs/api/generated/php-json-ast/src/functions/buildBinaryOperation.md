[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildBinaryOperation

# Function: buildBinaryOperation()

```ts
function buildBinaryOperation(
	operator,
	left,
	right,
	attributes?
): PhpExprBinaryOp;
```

## Parameters

### operator

[`PhpBinaryOperator`](../type-aliases/PhpBinaryOperator.md)

### left

[`PhpExpr`](../type-aliases/PhpExpr.md)

### right

[`PhpExpr`](../type-aliases/PhpExpr.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprBinaryOp`](../interfaces/PhpExprBinaryOp.md)
