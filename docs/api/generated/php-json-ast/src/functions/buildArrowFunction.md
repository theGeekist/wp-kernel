[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildArrowFunction

# Function: buildArrowFunction()

```ts
function buildArrowFunction(options, attributes?): PhpExprArrowFunction;
```

## Parameters

### options

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### static?

`boolean`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpExprArrowFunction`](../interfaces/PhpExprArrowFunction.md)
