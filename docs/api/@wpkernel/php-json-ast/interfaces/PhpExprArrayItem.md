[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpExprArrayItem

# Interface: PhpExprArrayItem

Represents an item within a PHP array expression.

## Extends

- [`PhpExprBase`](PhpExprBase.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpExprBase`](PhpExprBase.md).[`attributes`](PhpExprBase.md#attributes)
