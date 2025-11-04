[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpStmtDo

# Interface: PhpStmtDo

Represents a PHP `do-while` loop statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Do";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### cond

```ts
readonly cond: PhpExpr;
```

***

### stmts

```ts
readonly stmts: PhpStmt[];
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
