[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprArrowFunction

# Interface: PhpExprArrowFunction

Represents a PHP arrow function expression (e.g., `fn($x) => $x * 2`).

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
