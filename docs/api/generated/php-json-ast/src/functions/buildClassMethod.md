[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildClassMethod

# Function: buildClassMethod()

```ts
function buildClassMethod(name, options, attributes?): PhpStmtClassMethod;
```

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

### options

#### byRef?

`boolean`

#### flags?

`number`

#### params?

[`PhpParam`](../interfaces/PhpParam.md)[]

#### returnType?

[`PhpType`](../type-aliases/PhpType.md) \| `null`

#### stmts?

[`PhpStmt`](../type-aliases/PhpStmt.md)[] \| `null`

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtClassMethod`](../interfaces/PhpStmtClassMethod.md)
