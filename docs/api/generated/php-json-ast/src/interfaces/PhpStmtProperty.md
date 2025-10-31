[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpStmtProperty

# Interface: PhpStmtProperty

## Extends

- [`PhpStmtBase`](PhpStmtBase.md)

## Properties

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpStmtBase`](PhpStmtBase.md).[`attributes`](PhpStmtBase.md#attributes)

---

### flags

```ts
readonly flags: number;
```

---

### hooks

```ts
readonly hooks: PhpPropertyHook[];
```

---

### nodeType

```ts
readonly nodeType: "Stmt_Property";
```

#### Overrides

[`PhpStmtBase`](PhpStmtBase.md).[`nodeType`](PhpStmtBase.md#nodetype)

---

### props

```ts
readonly props: PhpStmtPropertyProperty[];
```

---

### type

```ts
readonly type: PhpType | null;
```
