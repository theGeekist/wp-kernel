[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildArrowFunction

# Function: buildArrowFunction()

```ts
function buildArrowFunction(options, attributes?): PhpExprArrowFunction;
```

## Parameters

### options

#### static?

`boolean`

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprArrowFunction`](../interfaces/PhpExprArrowFunction.md)
