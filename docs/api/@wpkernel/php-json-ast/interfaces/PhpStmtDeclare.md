[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpStmtDeclare

# Interface: PhpStmtDeclare

Represents a PHP `declare` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Declare";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### declares

```ts
readonly declares: PhpDeclareItem[];
```

---

### stmts

```ts
readonly stmts: PhpStmt[] | null;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
