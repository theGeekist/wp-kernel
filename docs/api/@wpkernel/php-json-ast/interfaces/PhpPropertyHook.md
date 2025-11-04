[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpPropertyHook

# Interface: PhpPropertyHook

Represents a PHP property hook (e.g., `__get`, `__set`).

## Extends

- [`PhpNode`](PhpNode.md)

## Properties

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

---

### attributes

```ts
readonly attributes: PhpAttributes;
```

#### Inherited from

[`PhpNode`](PhpNode.md).[`attributes`](PhpNode.md#attributes)
