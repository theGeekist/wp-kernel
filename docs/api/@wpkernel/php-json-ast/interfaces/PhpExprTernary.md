[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpExprTernary

# Interface: PhpExprTernary

Represents a PHP ternary expression (e.g., `$a ? $b : $c`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_Ternary";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### cond

```ts
readonly cond: PhpExpr;
```

***

### if

```ts
readonly if: PhpExpr | null;
```

***

### else

```ts
readonly else: PhpExpr;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
