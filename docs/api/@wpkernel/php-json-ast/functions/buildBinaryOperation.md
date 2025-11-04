[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildBinaryOperation

# Function: buildBinaryOperation()

```ts
function buildBinaryOperation(
	operator,
	left,
	right,
	attributes?
): PhpExprBinaryOp;
```

Builds a PHP binary operation expression node.

## Parameters

### operator

[`PhpBinaryOperator`](../type-aliases/PhpBinaryOperator.md)

The binary operator (e.g., 'Plus', 'BooleanAnd').

### left

[`PhpExpr`](../type-aliases/PhpExpr.md)

The left-hand side expression.

### right

[`PhpExpr`](../type-aliases/PhpExpr.md)

The right-hand side expression.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprBinaryOp`](../interfaces/PhpExprBinaryOp.md)

A `PhpExprBinaryOp` node.
