[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpScalarMagicConst

# Interface: PhpScalarMagicConst

Represents a PHP magic constant scalar node (e.g., `__FILE__`, `__LINE__`).

## Extends

- [`PhpScalarBase`](PhpScalarBase.md)

## Properties

### nodeType

```ts
readonly nodeType: `Scalar_MagicConst_${string}`;
```

#### Overrides

[`PhpScalarBase`](PhpScalarBase.md).[`nodeType`](PhpScalarBase.md#nodetype)

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpScalarBase`](PhpScalarBase.md).[`attributes`](PhpScalarBase.md#attributes)
