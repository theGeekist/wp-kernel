[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpScalarBase

# Interface: PhpScalarBase

Base interface for all PHP scalar nodes.

## Extends

- [`PhpNode`](PhpNode.md)

## Extended by

- [`PhpScalarString`](PhpScalarString.md)
- [`PhpScalarLNumber`](PhpScalarLNumber.md)
- [`PhpScalarDNumber`](PhpScalarDNumber.md)
- [`PhpScalarMagicConst`](PhpScalarMagicConst.md)

## Properties

### nodeType

```ts
readonly nodeType: `Scalar_${string}`;
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
