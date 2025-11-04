[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildAttributeGroup

# Function: buildAttributeGroup()

```ts
function buildAttributeGroup(attrs, attributes?): PhpAttrGroup;
```

Builds a PHP attribute group node.

## Parameters

### attrs

[`PhpAttribute`](../interfaces/PhpAttribute.md)[]

An array of `PhpAttribute` nodes within the group.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpAttrGroup`](../interfaces/PhpAttrGroup.md)

A `PhpAttrGroup` node.
