[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / MissingDependencyDiagnostic

# Interface: MissingDependencyDiagnostic

Diagnostic emitted when a required helper dependency is missing.

## Properties

### type

```ts
readonly type: "missing-dependency";
```

The type of diagnostic, always 'missing-dependency'.

---

### key

```ts
readonly key: string;
```

The key of the helper emitting the diagnostic.

---

### dependency

```ts
readonly dependency: string;
```

Identifier of the missing dependency helper.

---

### message

```ts
readonly message: string;
```

A descriptive message about the missing dependency.

---

### kind?

```ts
readonly optional kind: HelperKind;
```

Helper kind associated with the diagnostic.

---

### helper?

```ts
readonly optional helper: string;
```

Optional helper key associated with the dependency.
