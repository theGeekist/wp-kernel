[**@wpkernel/pipeline v0.11.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic\<TKind\>

Diagnostic for conflicting helper registrations.

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

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
