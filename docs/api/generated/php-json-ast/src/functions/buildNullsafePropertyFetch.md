[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildNullsafePropertyFetch

# Function: buildNullsafePropertyFetch()

```ts
function buildNullsafePropertyFetch(
	variable,
	name,
	attributes?
): PhpExprNullsafePropertyFetch;
```

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

### name

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprNullsafePropertyFetch`](../interfaces/PhpExprNullsafePropertyFetch.md)
