[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprCastBool

# Interface: PhpExprCastBool

Represents a PHP boolean cast expression (e.g., `(bool) $var`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Expr_Cast_Bool";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
