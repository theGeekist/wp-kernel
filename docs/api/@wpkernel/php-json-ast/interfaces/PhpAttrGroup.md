[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpAttrGroup

# Interface: PhpAttrGroup

Represents a group of PHP attributes (e.g., `#[Attr1, Attr2]`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### nodeType

```ts
readonly nodeType: "AttributeGroup";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### attrs

```ts
readonly attrs: PhpAttribute[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
