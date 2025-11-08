[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtClassConst

# Interface: PhpStmtClassConst

Represents a PHP class constant declaration statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
