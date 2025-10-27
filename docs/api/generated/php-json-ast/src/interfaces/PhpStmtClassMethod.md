[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtClassMethod

# Interface: PhpStmtClassMethod

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
readonly nodeType: "Stmt_ClassMethod";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### flags

```ts
readonly flags: number;
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
readonly stmts: PhpStmt[] | null;
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```
