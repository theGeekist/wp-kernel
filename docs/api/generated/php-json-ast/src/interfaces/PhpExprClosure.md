[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprClosure

# Interface: PhpExprClosure

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
readonly nodeType: "Expr_Closure";
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

### uses

```ts
readonly uses: PhpClosureUse[];
```

---

### returnType

```ts
readonly returnType: PhpType | null;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```
