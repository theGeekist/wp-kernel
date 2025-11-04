[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildContinue

# Function: buildContinue()

```ts
function buildContinue(num, attributes?): PhpStmtContinue;
```

Builds a PHP `continue` statement node.

## Parameters

### num

The optional number of loops to continue (e.g., `continue 2`).

[`PhpExpr`](../type-aliases/PhpExpr.md) | `null`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpStmtContinue`](../interfaces/PhpStmtContinue.md)

A `PhpStmtContinue` node.
