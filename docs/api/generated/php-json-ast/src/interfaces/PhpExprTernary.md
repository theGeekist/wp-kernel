[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprTernary

# Interface: PhpExprTernary

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

### cond

```ts
readonly cond: PhpExpr;
```

---

### else

```ts
readonly else: PhpExpr;
```

---

### if

```ts
readonly if: PhpExpr | null;
```

---

### nodeType

```ts
readonly nodeType: "Expr_Ternary";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
