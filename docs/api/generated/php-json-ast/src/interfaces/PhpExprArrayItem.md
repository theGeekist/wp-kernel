[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpExprArrayItem

# Interface: PhpExprArrayItem

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
readonly nodeType: "ArrayItem";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### key

```ts
readonly key: PhpExpr | null;
```

---

### value

```ts
readonly value: PhpExpr;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### unpack

```ts
readonly unpack: boolean;
```
