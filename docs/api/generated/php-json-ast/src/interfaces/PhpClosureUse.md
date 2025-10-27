[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpClosureUse

# Interface: PhpClosureUse

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
readonly nodeType: "ClosureUse" | "Expr_ClosureUse";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### var

```ts
readonly var: PhpExprVariable;
```

---

### byRef

```ts
readonly byRef: boolean;
```
