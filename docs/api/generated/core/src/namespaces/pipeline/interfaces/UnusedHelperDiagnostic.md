[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic\&lt;TKind\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)

## Properties

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

---

### helper?

```ts
readonly optional helper: string;
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

### type

```ts
readonly type: "unused-helper";
```
