[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpClosureUse

# Interface: PhpClosureUse

Represents a PHP `use` statement in a closure (e.g., `function () use ($var)`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
