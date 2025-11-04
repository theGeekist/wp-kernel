[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpMatchArm

# Interface: PhpMatchArm

Represents a single arm in a PHP `match` expression.

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "MatchArm";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

***

### conds

```ts
readonly conds: PhpExpr[] | null;
```

***

### body

```ts
readonly body: PhpExpr;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
