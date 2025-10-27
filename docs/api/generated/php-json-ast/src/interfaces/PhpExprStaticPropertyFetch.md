[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprStaticPropertyFetch

# Interface: PhpExprStaticPropertyFetch

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
readonly nodeType: "Expr_StaticPropertyFetch";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### class

```ts
readonly class: PhpExpr | PhpName;
```

---

### name

```ts
readonly name:
  | PhpExpr
  | PhpIdentifier;
```
