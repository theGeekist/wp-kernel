[**WP Kernel API v0.9.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### type

```ts
readonly type: "missing-dependency";
```

---

### key

```ts
readonly key: string;
```

---

### dependency

```ts
readonly dependency: string;
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

---

### helper?

```ts
readonly optional helper: string;
```
