[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpExprNullsafeMethodCall

# Interface: PhpExprNullsafeMethodCall

Represents a PHP nullsafe method call expression (e.g., `$object?-&gt;method()`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

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

---

### name

```ts
readonly name:
  | PhpExpr
  | PhpIdentifier;
```

---

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
