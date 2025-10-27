[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpClassTemplateOptions

# Interface: PhpClassTemplateOptions

## Properties

### name

```ts
readonly name: string;
```

---

### flags?

```ts
readonly optional flags: number;
```

---

### docblock?

```ts
readonly optional docblock: readonly string[];
```

---

### extends?

```ts
readonly optional extends: string | PhpName | readonly string[] | null;
```

---

### implements?

```ts
readonly optional implements: readonly (string | PhpName | readonly string[])[];
```

---

### methods?

```ts
readonly optional methods: readonly PhpMethodTemplate[];
```

---

### members?

```ts
readonly optional members: readonly PhpPrintable<PhpClassStmt>[];
```

---

### attrGroups?

```ts
readonly optional attrGroups: readonly PhpAttrGroup[];
```

---

### attributes?

```ts
readonly optional attributes: Readonly<Record<string, unknown>>;
```
