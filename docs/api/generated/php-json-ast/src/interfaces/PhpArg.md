[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpArg

# Interface: PhpArg

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "Arg";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

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

### name

```ts
readonly name: PhpIdentifier | null;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
