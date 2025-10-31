[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprMatch

# Interface: PhpExprMatch

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

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

---

### cond

```ts
readonly cond: PhpExpr;
```

---

### nodeType

```ts
readonly nodeType: "Expr_Match";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
