[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpParam

# Interface: PhpParam

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### nodeType

```ts
readonly nodeType: "Param";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### type

```ts
readonly type: PhpType | null;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### variadic

```ts
readonly variadic: boolean;
```

---

### var

```ts
readonly var: PhpExpr;
```

---

### default

```ts
readonly default: PhpExpr | null;
```

---

### flags

```ts
readonly flags: number;
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
