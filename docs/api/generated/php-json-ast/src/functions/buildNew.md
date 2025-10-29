[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildNew

# Function: buildNew()

```ts
function buildNew(className, args, attributes?): PhpExprNew;
```

## Parameters

### className

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpName`](../interfaces/PhpName.md)

### args

[`PhpArg`](../interfaces/PhpArg.md)[] = `[]`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprNew`](../interfaces/PhpExprNew.md)
