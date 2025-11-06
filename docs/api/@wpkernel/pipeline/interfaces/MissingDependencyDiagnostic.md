[**@wpkernel/pipeline v0.11.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic\<TKind\>

Diagnostic for missing helper dependencies.

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

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
