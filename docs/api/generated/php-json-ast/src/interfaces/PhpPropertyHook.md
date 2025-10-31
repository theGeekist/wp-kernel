[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpPropertyHook

# Interface: PhpPropertyHook

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

### body

```ts
readonly body:
  | PhpExpr
  | PhpStmt[]
  | null;
```

---

### byRef

```ts
readonly byRef: boolean;
```

---

### flags

```ts
readonly flags: number;
```

---

### name

```ts
readonly name: PhpIdentifier;
```

---

### nodeType

```ts
readonly nodeType: "PropertyHook";
```

#### Overrides

[`PhpNode`](PhpNode.md).[`nodeType`](PhpNode.md#nodetype)

---

### params

```ts
readonly params: PhpParam[];
```
