[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildNew

# Function: buildNew()

```ts
function buildNew(
   className, 
   args, 
   attributes?): PhpExprNew;
```

Builds a PHP `new` expression node.

## Parameters

### className

The name of the class to instantiate, either a `PhpName` or an expression.

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

An array of `PhpArg` nodes representing the constructor arguments.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprNew`](../interfaces/PhpExprNew.md)

A `PhpExprNew` node.
