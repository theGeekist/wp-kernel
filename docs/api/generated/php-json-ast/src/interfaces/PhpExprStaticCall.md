[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprStaticCall

# Interface: PhpExprStaticCall

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

---

### nodeType

```ts
readonly nodeType: "Expr_StaticCall";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)
