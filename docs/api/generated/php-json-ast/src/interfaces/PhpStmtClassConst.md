[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtClassConst

# Interface: PhpStmtClassConst

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
readonly nodeType: "Stmt_ClassConst";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### flags

```ts
readonly flags: number;
```

---

### consts

```ts
readonly consts: PhpConst[];
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### type

```ts
readonly type: PhpType | null;
```
