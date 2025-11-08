[**@wpkernel/pipeline v0.12.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / CreatePipelineOptions

# Interface: CreatePipelineOptions\<TRunOptions, TBuildOptions, TContext, TReporter, TDraft, TArtifact, TDiagnostic, TRunResult, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper\>

Options for creating a pipeline.

## Type Parameters

### TRunOptions

`TRunOptions`

### TBuildOptions

`TBuildOptions`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ [`PipelineReporter`](PipelineReporter.md) = [`PipelineReporter`](PipelineReporter.md)

### TDraft

`TDraft` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TRunResult

`TRunResult` = [`PipelineRunState`](PipelineRunState.md)\<`TArtifact`, `TDiagnostic`\>

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](Helper.md)\<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\> = [`Helper`](Helper.md)\<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\>

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](Helper.md)\<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\> = [`Helper`](Helper.md)\<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\>

## Properties

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

### createFragmentState()

```ts
readonly createFragmentState: (options) => TDraft;
```

#### Parameters

##### options

###### options

`TRunOptions`

###### context

`TContext`

###### buildOptions

`TBuildOptions`

#### Returns

`TDraft`

---

### createFragmentArgs()

```ts
readonly createFragmentArgs: (options) => HelperApplyOptions<TContext, TFragmentInput, TFragmentOutput, TReporter>;
```

#### Parameters

##### options

###### helper

`TFragmentHelper`

###### options

`TRunOptions`

###### context

`TContext`

###### buildOptions

`TBuildOptions`

###### draft

`TDraft`

#### Returns

[`HelperApplyOptions`](HelperApplyOptions.md)\<`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`\>

---

### finalizeFragmentState()

```ts
readonly finalizeFragmentState: (options) => TArtifact;
```

#### Parameters

##### options

###### draft

`TDraft`

###### options

`TRunOptions`

###### context

`TContext`

###### buildOptions

`TBuildOptions`

###### helpers

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)\<`TFragmentKind`\>

#### Returns

`TArtifact`

---

### createBuilderArgs()

```ts
readonly createBuilderArgs: (options) => HelperApplyOptions<TContext, TBuilderInput, TBuilderOutput, TReporter>;
```

#### Parameters

##### options

###### helper

`TBuilderHelper`

###### options

`TRunOptions`

###### context

`TContext`

###### buildOptions

`TBuildOptions`

###### artifact

`TArtifact`

#### Returns

[`HelperApplyOptions`](HelperApplyOptions.md)\<`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`\>

---

### fragmentKind?

```ts
readonly optional fragmentKind: TFragmentKind;
```

---

### builderKind?

```ts
readonly optional builderKind: TBuilderKind;
```

---

### createError()?

```ts
readonly optional createError: (code, message) => Error;
```

#### Parameters

##### code

`string`

##### message

`string`

#### Returns

`Error`

---

### createRunResult()?

```ts
readonly optional createRunResult: (options) => TRunResult;
```

#### Parameters

##### options

###### artifact

`TArtifact`

###### diagnostics

readonly `TDiagnostic`[]

###### steps

readonly [`PipelineStep`](PipelineStep.md)\<[`HelperKind`](../type-aliases/HelperKind.md)\>[]

###### context

`TContext`

###### buildOptions

`TBuildOptions`

###### options

`TRunOptions`

###### helpers

[`PipelineExecutionMetadata`](PipelineExecutionMetadata.md)\<`TFragmentKind`, `TBuilderKind`\>

#### Returns

`TRunResult`

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

###### reporter

`TReporter`

###### diagnostic

`TDiagnostic`

#### Returns

`void`

---

### createExtensionHookOptions()?

```ts
readonly optional createExtensionHookOptions: (options) => PipelineExtensionHookOptions<TContext, TRunOptions, TArtifact>;
```

#### Parameters

##### options

###### context

`TContext`

###### options

`TRunOptions`

###### buildOptions

`TBuildOptions`

###### artifact

`TArtifact`

#### Returns

[`PipelineExtensionHookOptions`](PipelineExtensionHookOptions.md)\<`TContext`, `TRunOptions`, `TArtifact`\>

---

### onExtensionRollbackError()?

```ts
readonly optional onExtensionRollbackError: (options) => void;
```

#### Parameters

##### options

###### error

`unknown`

###### extensionKeys

readonly `string`[]

###### hookSequence

readonly `string`[]

###### errorMetadata

[`PipelineExtensionRollbackErrorMetadata`](PipelineExtensionRollbackErrorMetadata.md)

###### context

`TContext`

#### Returns

`void`

---

### createConflictDiagnostic()?

```ts
readonly optional createConflictDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### existing

`TFragmentHelper` \| `TBuilderHelper`

###### message

`string`

#### Returns

`TDiagnostic`

---

### createMissingDependencyDiagnostic()?

```ts
readonly optional createMissingDependencyDiagnostic: (options) => TDiagnostic;
```

#### Parameters

##### options

###### helper

`TFragmentHelper` \| `TBuilderHelper`

###### dependency

`string`

###### message

`string`

#### Returns

`TDiagnostic`

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
