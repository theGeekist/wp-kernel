[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / Pipeline

# Type Alias: Pipeline

```ts
type Pipeline = CorePipeline & lt;
(PipelineRunOptions,
	PipelineRunResult,
	PipelineContext,
	PipelineContext['reporter'],
	BuildIrOptions,
	IRv1,
	FragmentInput,
	FragmentOutput,
	BuilderInput,
	BuilderOutput,
	PipelineDiagnostic,
	FragmentHelper['kind'],
	BuilderHelper['kind'],
	FragmentHelper,
	BuilderHelper & gt);
```

The main pipeline interface for CLI operations.
