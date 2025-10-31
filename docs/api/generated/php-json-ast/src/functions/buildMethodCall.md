[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildMethodCall

# Function: buildMethodCall()

```ts
function buildMethodCall(variable, name, args, attributes?): PhpExprMethodCall;
```

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

### name

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprMethodCall`](../interfaces/PhpExprMethodCall.md)
