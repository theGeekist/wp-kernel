[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpStmtProperty

# Interface: PhpStmtProperty

Represents a PHP class property declaration statement.

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### nodeType

```ts
readonly nodeType: "Stmt_Property";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### flags

```ts
readonly flags: number;
```

---

### type

```ts
readonly type: PhpType | null;
```

---

### props

```ts
readonly props: PhpStmtPropertyProperty[];
```

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### hooks

```ts
readonly hooks: PhpPropertyHook[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)
