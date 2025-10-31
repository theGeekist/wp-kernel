[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildPropertyHook

# Function: buildPropertyHook()

```ts
function buildPropertyHook(name, body, options, attributes?): PhpPropertyHook;
```

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### body

[`PhpExpr`](../type-aliases/PhpExpr.md) | [`PhpStmt`](../type-aliases/PhpStmt.md)[] | `null`

### options

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### flags?

`number`

#### byRef?

`boolean`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpPropertyHook`](../interfaces/PhpPropertyHook.md)
