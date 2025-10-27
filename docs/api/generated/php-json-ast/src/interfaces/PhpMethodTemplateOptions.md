[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / PhpMethodTemplateOptions

# Interface: PhpMethodTemplateOptions

## Properties

### signature

```ts
signature: string;
```

---

### indentLevel

```ts
indentLevel: number;
```

---

### docblock?

```ts
optional docblock: string[];
```

---

### indentUnit?

```ts
optional indentUnit: string;
```

---

### body()

```ts
body: (body) => void;
```

#### Parameters

##### body

[`PhpMethodBodyBuilder`](../classes/PhpMethodBodyBuilder.md)

#### Returns

`void`

---

### ast?

```ts
optional ast: PhpMethodTemplateAstOptions;
```
