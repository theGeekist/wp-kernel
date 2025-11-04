[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildClass

# Function: buildClass()

```ts
function buildClass(
   name, 
   options, 
   attributes?): PhpStmtClass;
```

Builds a PHP class declaration statement node.

## Parameters

### name

The name of the class, or `null` for an anonymous class.

[`PhpIdentifier`](../interfaces/PhpIdentifier.md) | `null`

### options

Optional configuration for the class (flags, extends, implements, statements, attribute groups, namespaced name).

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

Optional attributes for the node.

## Returns

[`PhpStmtClass`](../interfaces/PhpStmtClass.md)

A `PhpStmtClass` node.
