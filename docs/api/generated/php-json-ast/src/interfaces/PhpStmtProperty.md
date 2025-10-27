[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtProperty

# Interface: PhpStmtProperty

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
