[**@wpkernel/pipeline v0.11.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic\&lt;TKind\&gt;

Diagnostic for unused helpers.

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
