[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprBinaryOp

# Interface: PhpExprBinaryOp

Represents a PHP binary operation expression (e.g., `$a + $b`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
