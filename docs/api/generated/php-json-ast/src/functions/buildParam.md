[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildParam

# Function: buildParam()

```ts
function buildParam(variable, options, attributes?): PhpParam;
```

## Parameters

### variable

[`PhpExpr`](../type-aliases/PhpExpr.md)

### options

#### type?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### byRef?

`boolean`

#### variadic?

`boolean`

#### default?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### flags?

`number`

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### hooks?

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpParam`](../interfaces/PhpParam.md)
