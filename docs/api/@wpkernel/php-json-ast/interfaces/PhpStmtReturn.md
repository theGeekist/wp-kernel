[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtReturn

# Interface: PhpStmtReturn

Represents a PHP `return` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Return";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### expr

```ts
readonly expr: PhpExpr | null;
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
