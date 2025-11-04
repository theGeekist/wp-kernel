[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / PhpStmtIf

# Interface: PhpStmtIf

Represents a PHP `if` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_If";
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

### elseifs

```ts
readonly elseifs: PhpStmtElseIf[];
```

***

### else

```ts
readonly else: PhpStmtElse | null;
```

***

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
