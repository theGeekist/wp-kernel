[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpPropertyHook

# Interface: PhpPropertyHook

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
readonly nodeType: "PropertyHook";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### attrGroups

```ts
readonly attrGroups: PhpAttrGroup[];
```

---

### flags

```ts
readonly flags: number;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### params

```ts
readonly params: PhpParam[];
```

---

### body

```ts
readonly body:
  | PhpExpr
  | PhpStmt[]
  | null;
```
