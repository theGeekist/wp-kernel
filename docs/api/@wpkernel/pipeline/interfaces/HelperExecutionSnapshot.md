[**@wpkernel/pipeline v0.11.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / HelperExecutionSnapshot

# Interface: HelperExecutionSnapshot\&lt;TKind\&gt;

Snapshot of helper execution status.

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### kind

```ts
readonly kind: TKind;
```

---

### registered

```ts
readonly registered: readonly string[];
```

---

### executed

```ts
readonly executed: readonly string[];
```

---

### missing

```ts
readonly missing: readonly string[];
```
