[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpDeclareItem

# Interface: PhpDeclareItem

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### nodeType

```ts
readonly nodeType: "DeclareItem";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### key

```ts
readonly key: PhpIdentifier;
```

---

### value

```ts
readonly value: PhpExpr;
```
