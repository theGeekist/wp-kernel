[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineRunResult

# Interface: PipelineRunResult

The result of a pipeline run.

## Properties

### ir

```ts
readonly ir: IRv1;
```

The generated Intermediate Representation (IR).

---

### diagnostics

```ts
readonly diagnostics: readonly ConflictDiagnostic[];
```

An array of diagnostic messages.

---

### steps

```ts
readonly steps: readonly PipelineStep[];
```

An array of executed pipeline steps.
