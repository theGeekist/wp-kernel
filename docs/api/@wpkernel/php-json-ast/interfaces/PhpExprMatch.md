[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpExprMatch

# Interface: PhpExprMatch

Represents a PHP `match` expression.

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_Match";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### cond

```ts
readonly cond: PhpExpr;
```

---

### arms

```ts
readonly arms: PhpMatchArm[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
