[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### helpers

```ts
readonly helpers: readonly string[];
```

---

### key

```ts
readonly key: string;
```

---

### kind?

```ts
readonly optional kind: TKind;
```

---

### message

```ts
readonly message: string;
```

---

### mode

```ts
readonly mode: HelperMode;
```

---

### type

```ts
readonly type: "conflict";
```
