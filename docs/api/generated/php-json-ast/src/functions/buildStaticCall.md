[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildStaticCall

# Function: buildStaticCall()

```ts
function buildStaticCall(className, name, args, attributes?): PhpExprStaticCall;
```

## Parameters

### className

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### name

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprStaticCall`](../interfaces/PhpExprStaticCall.md)
