[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpStmtSwitch

# Interface: PhpStmtSwitch

Represents a PHP `switch` statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Switch";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### cond

```ts
readonly cond: PhpExpr;
```

---

### cases

```ts
readonly cases: PhpStmtCase[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
