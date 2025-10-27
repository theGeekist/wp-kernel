[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineRunState

# Interface: PipelineRunState\&lt;TArtifact, TDiagnostic\&gt;

## Type Parameters

### TArtifact

`TArtifact`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

## Properties

### artifact

```ts
readonly artifact: TArtifact;
```

---

### diagnostics

```ts
readonly diagnostics: readonly TDiagnostic[];
```

---

### steps

```ts
readonly steps: readonly PipelineStep<HelperKind>[];
```
