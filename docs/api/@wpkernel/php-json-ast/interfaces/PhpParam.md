[**@wpkernel/php-json-ast v0.11.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / PhpParam

# Interface: PhpParam

Represents a PHP parameter node in a function or method signature.

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
