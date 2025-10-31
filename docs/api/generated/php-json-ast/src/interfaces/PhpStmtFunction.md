[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtFunction

# Interface: PhpStmtFunction

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
readonly nodeType: "Stmt_Function";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### byRef

```ts
readonly byRef: boolean;
```

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### params

```ts
readonly params: PhpParam[];
```

---

### returnType

```ts
readonly returnType: PhpType | null;
```

---

### stmts

```ts
readonly stmts: PhpStmt[];
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### namespacedName

```ts
readonly namespacedName: PhpName | null;
```
