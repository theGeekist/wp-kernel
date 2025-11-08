[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic

Diagnostic emitted when two helpers conflict.

## Example

```ts
A generate helper overrides another helper with the same key.
```

## Properties

### type

```ts
readonly type: "conflict";
```

The type of diagnostic, always 'conflict'.

---

### key

```ts
readonly key: string;
```

The key of the helper that caused the conflict.

---

### mode

```ts
readonly mode: HelperMode;
```

The conflict resolution mode (e.g., 'override').

---

### helpers

```ts
readonly helpers: readonly string[];
```

A list of helpers involved in the conflict.

---

### message

```ts
readonly message: string;
```

A descriptive message about the conflict.

---

### kind?

```ts
readonly optional kind: HelperKind;
```

Helper kind associated with the conflict.
