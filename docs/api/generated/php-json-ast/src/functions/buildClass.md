[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / buildClass

# Function: buildClass()

```ts
function buildClass(name, options, attributes?): PhpStmtClass;
```

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) | `null`

### options

#### flags?

`number`

#### extends?

[`PhpName`](../interfaces/PhpName.md) \| `null`

#### implements?

[`PhpName`](../interfaces/PhpName.md)[]

#### stmts?

[`PhpClassStmt`](../type-aliases/PhpClassStmt.md)[]

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### namespacedName?

[`PhpName`](../interfaces/PhpName.md) \| `null`

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtClass`](../interfaces/PhpStmtClass.md)
