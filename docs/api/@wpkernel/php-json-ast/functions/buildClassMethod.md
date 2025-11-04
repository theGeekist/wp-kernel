[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildClassMethod

# Function: buildClassMethod()

```ts
function buildClassMethod(name, options, attributes?): PhpStmtClassMethod;
```

Builds a PHP class method declaration statement node.

## Parameters

### name

[`PhpIdentifier`](../interfaces/PhpIdentifier.md)

The name of the method.

### options

Optional configuration for the method (by reference, flags, parameters, return type, statements, attribute groups).

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

Optional attributes for the node.

## Returns

[`PhpStmtClassMethod`](../interfaces/PhpStmtClassMethod.md)

A `PhpStmtClassMethod` node.
