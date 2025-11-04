[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildFullyQualifiedName

# Function: buildFullyQualifiedName()

```ts
function buildFullyQualifiedName(parts, attributes?): PhpName;
```

Builds a fully qualified PHP name node.

## Parameters

### parts

`string`[]

An array of strings representing the parts of the fully qualified name.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpName`](../interfaces/PhpName.md)

A `PhpName` node with `nodeType` set to 'Name_FullyQualified'.
