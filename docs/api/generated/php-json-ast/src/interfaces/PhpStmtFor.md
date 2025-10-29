[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtFor

# Interface: PhpStmtFor

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

---

### nodeType

```ts
readonly nodeType: "Stmt_For";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### init

```ts
readonly init: PhpExpr[];
```

---

### cond

```ts
readonly cond: PhpExpr[];
```

---

### loop

```ts
readonly loop: PhpExpr[];
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```
