[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpDeclareItem

# Interface: PhpDeclareItem

Represents a PHP declare item (e.g., `encoding='UTF-8'` in `declare(encoding='UTF-8');`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "DeclareItem";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### key

```ts
readonly key: PhpIdentifier;
```

***

### value

```ts
readonly value: PhpExpr;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
