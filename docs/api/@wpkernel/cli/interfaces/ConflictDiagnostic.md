[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ConflictDiagnostic

# Interface: ConflictDiagnostic

Diagnostic for a conflict detected during pipeline execution.

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
