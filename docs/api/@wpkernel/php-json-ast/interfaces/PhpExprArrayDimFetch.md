[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpExprArrayDimFetch

# Interface: PhpExprArrayDimFetch

Represents a PHP array dimension fetch expression (e.g., `$array[key]`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_ArrayDimFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

***

### var

```ts
readonly var: PhpExpr;
```

***

### dim

```ts
readonly dim: PhpExpr | null;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
