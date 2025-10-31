[**WP Kernel API v0.10.0**](../../../README.md)

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

#### attrGroups?

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)[]

#### extends?

[`PhpName`](../interfaces/PhpName.md) \| `null`

#### flags?

`number`

#### implements?

[`PhpName`](../interfaces/PhpName.md)[]

#### namespacedName?

[`PhpName`](../interfaces/PhpName.md) \| `null`

#### stmts?

[`PhpClassStmt`](../type-aliases/PhpClassStmt.md)[]

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

## Returns

[`PhpStmtClass`](../interfaces/PhpStmtClass.md)
