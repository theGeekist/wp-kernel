[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / UnusedHelperDiagnostic

# Interface: UnusedHelperDiagnostic

Union of all diagnostics emitted by the pipeline.

## Properties

### type

```ts
readonly type: "unused-helper";
```

The type of diagnostic, always 'unused-helper'.

---

### key

```ts
readonly key: string;
```

The key of the helper emitting the diagnostic.

---

### message

```ts
readonly message: string;
```

A descriptive message about the unused helper.

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

Optional helper key flagged as unused.

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

Dependency list used when determining helper usage.
