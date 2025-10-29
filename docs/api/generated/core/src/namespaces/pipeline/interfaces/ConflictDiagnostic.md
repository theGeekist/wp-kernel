[**WP Kernel API v0.9.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### type

```ts
readonly type: "conflict";
```

---

### key

```ts
readonly key: string;
```

---

### mode

```ts
readonly mode: HelperMode;
```

---

### helpers

```ts
readonly helpers: readonly string[];
```

---

### message

```ts
readonly message: string;
```

---

### kind?

```ts
readonly optional kind: TKind;
```
