[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpParam

# Interface: PhpParam

## Extends

- [`PhpNode`](PhpNode.md)

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

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)

---

### byRef

```ts
readonly byRef: boolean;
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

### hooks

```ts
readonly hooks: PhpPropertyHook[];
```

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

### var

```ts
readonly var: PhpExpr;
```

---

### variadic

```ts
readonly variadic: boolean;
```
