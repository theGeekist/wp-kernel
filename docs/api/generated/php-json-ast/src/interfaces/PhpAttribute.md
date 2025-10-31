[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpAttribute

# Interface: PhpAttribute

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "Attribute";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### name

```ts
readonly name: PhpIdentifier | PhpName;
```

---

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

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
