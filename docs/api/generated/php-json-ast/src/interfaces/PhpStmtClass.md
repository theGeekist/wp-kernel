[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtClass

# Interface: PhpStmtClass

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
readonly nodeType: "Stmt_Class";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### name

```ts
readonly name: PhpIdentifier | null;
```

---

### flags

```ts
readonly flags: number;
```

---

### extends

```ts
readonly extends: PhpName | null;
```

---

### implements

```ts
readonly implements: PhpName[];
```

---

### stmts

```ts
readonly stmts: PhpClassStmt[];
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
