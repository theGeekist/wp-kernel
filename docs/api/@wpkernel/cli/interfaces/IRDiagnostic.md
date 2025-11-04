[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRDiagnostic

# Interface: IRDiagnostic

Represents an Intermediate Representation (IR) for a diagnostic message.

## Properties

### key

```ts
key: string;
```

A unique key for the diagnostic.

---

### message

```ts
message: string;
```

The diagnostic message.

---

### severity

```ts
severity: IRDiagnosticSeverity;
```

The severity of the diagnostic.

---

### context?

```ts
optional context: Record&lt;string, unknown&gt;;
```

Optional: Additional context for the diagnostic.
