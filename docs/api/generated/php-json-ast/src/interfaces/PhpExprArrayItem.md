[**WP Kernel API v0.10.0**](../../../README.md)

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

### byRef

```ts
readonly byRef: boolean;
```

---

### key

```ts
readonly key: PhpExpr | null;
```

---

### nodeType

```ts
readonly nodeType: "ArrayItem";
```

#### Overrides

[`PhpExprBase`](PhpExprBase.md).[`nodeType`](PhpExprBase.md#nodetype)

---

### unpack

```ts
readonly unpack: boolean;
```

---

### value

```ts
readonly value: PhpExpr;
```
