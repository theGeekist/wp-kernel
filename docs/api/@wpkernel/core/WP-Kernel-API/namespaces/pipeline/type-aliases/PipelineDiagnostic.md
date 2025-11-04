[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / PipelineDiagnostic

# Type Alias: PipelineDiagnostic\&lt;TKind\&gt;

```ts
type PipelineDiagnostic&lt;TKind&gt; = 
  | ConflictDiagnostic&lt;TKind&gt;
  | MissingDependencyDiagnostic&lt;TKind&gt;
| UnusedHelperDiagnostic&lt;TKind&gt;;
```

## Type Parameters

### TKind

`TKind` *extends* [`HelperKind`](HelperKind.md) = [`HelperKind`](HelperKind.md)
