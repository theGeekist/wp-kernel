[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtForeach

# Interface: PhpStmtForeach

Represents a PHP `foreach` loop statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
