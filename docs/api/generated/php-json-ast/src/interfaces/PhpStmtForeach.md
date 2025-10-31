[**WP Kernel API v0.10.0**](../../../README.md)

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

### byRef

```ts
readonly byRef: boolean;
```

---

### expr

```ts
readonly expr: PhpExpr;
```

---

### keyVar

```ts
readonly keyVar: PhpExpr | null;
```

---

### nodeType

```ts
readonly nodeType: "Stmt_Foreach";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### stmts

```ts
readonly stmts: PhpStmt[];
```

---

### valueVar

```ts
readonly valueVar: PhpExpr;
```
