[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildFuncCall

# Function: buildFuncCall()

```ts
function buildFuncCall(name, args, attributes?): PhpExprFuncCall;
```

Builds a PHP function call expression node.

## Parameters

### name

The name of the function, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the function arguments.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprFuncCall`](../interfaces/PhpExprFuncCall.md)

A `PhpExprFuncCall` node.
