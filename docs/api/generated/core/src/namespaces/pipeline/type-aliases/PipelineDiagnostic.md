[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineDiagnostic

# Type Alias: PipelineDiagnostic\&lt;TKind\&gt;

```ts
type PipelineDiagnostic<TKind> =
	| ConflictDiagnostic<TKind>
	| MissingDependencyDiagnostic<TKind>
	| UnusedHelperDiagnostic<TKind>;
```

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)
