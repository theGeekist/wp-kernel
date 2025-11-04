[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / buildNullableType

# Function: buildNullableType()

```ts
function buildNullableType(type, attributes?): PhpNullableType;
```

Builds a nullable PHP type node.

## Parameters

### type

[`PhpType`](../type-aliases/PhpType.md)

The type node to make nullable.

### attributes?

`Readonly`\&lt;`Record`\&lt;`string`, `unknown`\&gt;\&gt;

Optional attributes for the node.

## Returns

[`PhpNullableType`](../interfaces/PhpNullableType.md)

A `PhpNullableType` node.
