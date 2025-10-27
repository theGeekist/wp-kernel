[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpScalarBase

# Interface: PhpScalarBase

## Extends

- [`PhpNode`](PhpNode.md)

## Extended by

- [`PhpScalarString`](PhpScalarString.md)
- [`PhpScalarLNumber`](PhpScalarLNumber.md)
- [`PhpScalarDNumber`](PhpScalarDNumber.md)
- [`PhpScalarMagicConst`](PhpScalarMagicConst.md)

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
readonly nodeType: `Scalar_${string}`;
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
