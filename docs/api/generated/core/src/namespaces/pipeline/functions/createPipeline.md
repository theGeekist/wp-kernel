[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / createPipeline

# Function: createPipeline()

```ts
function createPipeline<
	TRunOptions,
	TBuildOptions,
	TContext,
	TReporter,
	TDraft,
	TArtifact,
	TDiagnostic,
	TRunResult,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper,
>(
	options
): Pipeline<
	TRunOptions,
	TRunResult,
	TContext,
	TReporter,
	TBuildOptions,
	TArtifact,
	TFragmentInput,
	TFragmentOutput,
	TBuilderInput,
	TBuilderOutput,
	TDiagnostic,
	TFragmentKind,
	TBuilderKind,
	TFragmentHelper,
	TBuilderHelper
>;
```

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](../interfaces/PipelineRunState.md)\&lt;`TArtifact`, `TDiagnostic`\&gt;

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](../../../../../php-json-ast/src/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt; = [`Helper`](../../../../../php-json-ast/src/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt;

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](../../../../../php-json-ast/src/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt; = [`Helper`](../../../../../php-json-ast/src/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt;

## Parameters

### options

[`CreatePipelineOptions`](../interfaces/CreatePipelineOptions.md)\&lt;`TRunOptions`, `TBuildOptions`, `TContext`, `TReporter`, `TDraft`, `TArtifact`, `TDiagnostic`, `TRunResult`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`\&gt;

## Returns

[`Pipeline`](../interfaces/Pipeline.md)\&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`\&gt;
