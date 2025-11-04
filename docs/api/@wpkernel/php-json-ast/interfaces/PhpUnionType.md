[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpUnionType

# Interface: PhpUnionType

Represents a PHP union type (e.g., `string|int`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "UnionType";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### types

```ts
readonly types: PhpType[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
