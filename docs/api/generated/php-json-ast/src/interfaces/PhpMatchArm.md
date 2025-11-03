[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpMatchArm

# Interface: PhpMatchArm

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

### body

```ts
readonly body: PhpExpr;
```

---

### conds

```ts
readonly conds: PhpExpr[] | null;
```

---

### nodeType

```ts
readonly nodeType: "MatchArm";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)
