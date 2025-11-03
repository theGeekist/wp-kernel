[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / CreatePipelineOptions

# Interface: CreatePipelineOptions\&lt;TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper\&gt;

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

`TRunResult` = [`PipelineRunState`](PipelineRunState.md)\&lt;`TArtifact`, `TDiagnostic`\&gt;

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt;

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt;

## Properties

### builderKind?

```ts
readonly optional builderKind: TBuilderKind;
```

---

### createBuilderArgs()

```ts
readonly createBuilderArgs: (options) => HelperApplyOptions<TContext, TBuilderInput, TBuilderOutput, TReporter>;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### helper

`TBuilderHelper`

###### options

`TRunOptions`

#### Returns

[`HelperApplyOptions`](../../../../../@wpkernel/cli/interfaces/HelperApplyOptions.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`\&gt;

---

### createBuildOptions()

```ts
readonly createBuildOptions: (options) => TBuildOptions;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TBuildOptions`

---

### createConflictDiagnostic()?

```ts
readonly optional createConflictDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### existing

`TFragmentHelper` \| `TBuilderHelper`

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

---

### createContext()

```ts
readonly createContext: (options) => TContext;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`TContext`

---

### createExtensionHookOptions()?

```ts
readonly optional createExtensionHookOptions: (options) => PipelineExtensionHookOptions<TContext, TBuildOptions, TArtifact>;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### options

`TRunOptions`

#### Returns

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)\&lt;`TContext`, `TBuildOptions`, `TArtifact`\&gt;

---

### createFragmentArgs()

```ts
readonly createFragmentArgs: (options) => HelperApplyOptions<TContext, TFragmentInput, TFragmentOutput, TReporter>;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### draft

`TDraft`

###### helper

`TFragmentHelper`

###### options

`TRunOptions`

#### Returns

[`HelperApplyOptions`](../../../../../@wpkernel/cli/interfaces/HelperApplyOptions.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`\&gt;

---

### createFragmentState()

```ts
readonly createFragmentState: (options) => TDraft;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### options

`TRunOptions`

#### Returns

`TDraft`

---

### createMissingDependencyDiagnostic()?

```ts
readonly optional createMissingDependencyDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### dependency

`string`

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

---

### createRunResult()?

```ts
readonly optional createRunResult: (options) => TRunResult;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### diagnostics

readonly `TDiagnostic`[]

###### helpers

[`PipelineExecutionMetadata`](PipelineExecutionMetadata.md)\&lt;`TFragmentKind`, `TBuilderKind`\&gt;

###### options

`TRunOptions`

###### steps

readonly [`PipelineStep`](PipelineStep.md)\&lt;[`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)\&gt;[]

#### Returns

`TRunResult`

---

### createUnusedHelperDiagnostic()?

```ts
readonly optional createUnusedHelperDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

---

### finalizeFragmentState()

```ts
readonly finalizeFragmentState: (options) => TArtifact;
```

#### Parameters

##### options

###### buildOptions

`TBuildOptions`

###### context

`TContext`

###### draft

`TDraft`

###### helpers

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)\&lt;`TFragmentKind`\&gt;

###### options

`TRunOptions`

#### Returns

`TArtifact`

---

### fragmentKind?

```ts
readonly optional fragmentKind: TFragmentKind;
```

---

### onDiagnostic()?

```ts
readonly optional onDiagnostic: (options) => void;
```

Optional hook invoked whenever a diagnostic is emitted during a run.

Consumers can stream diagnostics to logs or UI shells while the
pipeline executes instead of waiting for the final run result.

#### Parameters

##### options

###### diagnostic

`TDiagnostic`

###### reporter

`TReporter`

#### Returns

`void`

---

### onExtensionRollbackError()?

```ts
readonly optional onExtensionRollbackError: (options) => void;
```

#### Parameters

##### options

###### context

`TContext`

###### error

`unknown`

###### errorMetadata

[`PipelineExtensionRollbackErrorMetadata`](PipelineExtensionRollbackErrorMetadata.md)

###### extensionKeys

readonly `string`[]

###### hookSequence

readonly `string`[]

#### Returns

`void`
