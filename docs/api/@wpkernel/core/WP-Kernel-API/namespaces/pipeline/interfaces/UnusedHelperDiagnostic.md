[**WP Kernel API v0.11.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### type

```ts
readonly type: "unused-helper";
```

---

### key

```ts
readonly key: string;
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

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```
