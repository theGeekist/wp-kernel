[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpExprBooleanNot

# Interface: PhpExprBooleanNot

Represents a PHP boolean NOT expression (e.g., `!$foo`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_BooleanNot";
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
