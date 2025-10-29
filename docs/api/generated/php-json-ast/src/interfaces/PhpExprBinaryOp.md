[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprBinaryOp

# Interface: PhpExprBinaryOp

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

---

### nodeType

```ts
readonly nodeType: `Expr_BinaryOp_${string}`;
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### left

```ts
readonly left: PhpExpr;
```

---

### right

```ts
readonly right: PhpExpr;
```
