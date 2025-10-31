[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildNullsafeMethodCall

# Function: buildNullsafeMethodCall()

```ts
function buildNullsafeMethodCall(
	variable,
	name,
	args,
	attributes?
): PhpExprNullsafeMethodCall;
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

[`PhpExprNullsafeMethodCall`](../interfaces/PhpExprNullsafeMethodCall.md)
