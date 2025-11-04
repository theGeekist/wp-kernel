[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpStmtNamespace

# Interface: PhpStmtNamespace

Represents a PHP namespace declaration statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Namespace";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### name

```ts
readonly name: PhpName | null;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
