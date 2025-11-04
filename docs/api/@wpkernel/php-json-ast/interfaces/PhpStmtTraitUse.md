[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpStmtTraitUse

# Interface: PhpStmtTraitUse

Represents a PHP `trait use` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_TraitUse";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### traits

```ts
readonly traits: PhpName[];
```

---

### adaptations

```ts
readonly adaptations: PhpNode[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
