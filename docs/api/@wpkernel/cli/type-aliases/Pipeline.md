[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / Pipeline

# Type Alias: Pipeline

```ts
type Pipeline = CorePipeline<
	PipelineRunOptions,
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
	BuilderHelper
>;
```

The main pipeline interface for CLI operations.
