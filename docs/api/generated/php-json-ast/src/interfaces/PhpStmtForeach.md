[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtForeach

# Interface: PhpStmtForeach

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
readonly nodeType: "Stmt_Foreach";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### valueVar

```ts
readonly valueVar: PhpExpr;
```

---

### keyVar

```ts
readonly keyVar: PhpExpr | null;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```
