[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildArrowFunction

# Function: buildArrowFunction()

```ts
function buildArrowFunction(options, attributes?): PhpExprArrowFunction;
```

Builds a PHP arrow function expression node.

## Parameters

### options

Configuration for the arrow function (static, by reference, parameters, return type, expression body, attribute groups).

#### expr

[`PhpExpr`](../type-aliases/PhpExpr.md)

#### static?

`boolean`

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpExprArrowFunction`](../interfaces/PhpExprArrowFunction.md)

A `PhpExprArrowFunction` node.
