[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpExprThrow

# Interface: PhpExprThrow

Represents a PHP `throw` expression.

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_Throw";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### expr

```ts
readonly expr: PhpExpr;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
