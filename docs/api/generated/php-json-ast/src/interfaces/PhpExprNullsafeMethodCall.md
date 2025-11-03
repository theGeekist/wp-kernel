[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprNullsafeMethodCall

# Interface: PhpExprNullsafeMethodCall

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### args

```ts
readonly args: PhpArg[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

---

### name

```ts
readonly name:
  | PhpExpr
  | PhpIdentifier;
```

---

### nodeType

```ts
readonly nodeType: "Expr_NullsafeMethodCall";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### var

```ts
readonly var: PhpExpr;
```
