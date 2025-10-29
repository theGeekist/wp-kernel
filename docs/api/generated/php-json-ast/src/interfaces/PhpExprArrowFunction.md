[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprArrowFunction

# Interface: PhpExprArrowFunction

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
readonly nodeType: "Expr_ArrowFunction";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### static

```ts
readonly static: boolean;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### params

```ts
readonly params: PhpParam[];
```

---

### returnType

```ts
readonly returnType: PhpType | null;
```

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```
