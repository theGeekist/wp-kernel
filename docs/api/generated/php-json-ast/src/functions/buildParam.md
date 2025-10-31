[**WP Kernel API v0.10.0**](../../../README.md)

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

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### byRef?

`boolean`

#### default?

[`PhpExpr`](../type-aliases/PhpExpr.md) \| `null`

#### flags?

`number`

#### hooks?

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)[]

#### type?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### variadic?

`boolean`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpParam`](../interfaces/PhpParam.md)
