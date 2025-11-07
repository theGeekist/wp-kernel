[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpConst

# Interface: PhpConst

Represents a PHP constant definition (e.g., `const MY_CONST = 123;`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "Const";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### value

```ts
readonly value: PhpExpr;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
