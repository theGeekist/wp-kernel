[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpStmtFor

# Interface: PhpStmtFor

Represents a PHP `for` loop statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_For";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

***

### init

```ts
readonly init: PhpExpr[];
```

***

### cond

```ts
readonly cond: PhpExpr[];
```

***

### loop

```ts
readonly loop: PhpExpr[];
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
