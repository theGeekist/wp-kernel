[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprArrowFunction

# Interface: PhpExprArrowFunction

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)

---

### byRef

```ts
readonly byRef: boolean;
```

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### nodeType

```ts
readonly nodeType: "Expr_ArrowFunction";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

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

### static

```ts
readonly static: boolean;
```
