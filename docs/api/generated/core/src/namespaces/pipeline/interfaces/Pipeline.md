[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / Pipeline

# Interface: Pipeline\&lt;TRunOptions, TRunResult, TContext, TReporter, TBuildOptions, TArtifact, TFragmentInput, TFragmentOutput, TBuilderInput, TBuilderOutput, TDiagnostic, TFragmentKind, TBuilderKind, TFragmentHelper, TBuilderHelper\&gt;

## Type Parameters

### TRunOptions

`TRunOptions`

### TRunResult

`TRunResult`

### TContext

`TContext` _extends_ `object`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TBuildOptions

`TBuildOptions` = `unknown`

### TArtifact

`TArtifact` = `unknown`

### TFragmentInput

`TFragmentInput` = `unknown`

### TFragmentOutput

`TFragmentOutput` = `unknown`

### TBuilderInput

`TBuilderInput` = `unknown`

### TBuilderOutput

`TBuilderOutput` = `unknown`

### TDiagnostic

`TDiagnostic` _extends_ [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md) = [`PipelineDiagnostic`](../type-aliases/PipelineDiagnostic.md)

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"fragment"`

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = `"builder"`

### TFragmentHelper

`TFragmentHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TFragmentInput`, `TFragmentOutput`, `TReporter`, `TFragmentKind`\&gt;

### TBuilderHelper

`TBuilderHelper` _extends_ [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt; = [`Helper`](../../../../../@wpkernel/cli/interfaces/Helper.md)\&lt;`TContext`, `TBuilderInput`, `TBuilderOutput`, `TReporter`, `TBuilderKind`\&gt;

## Properties

### builderKind

```ts
readonly builderKind: TBuilderKind;
```

---

### builders

```ts
readonly builders: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

`TBuilderHelper`

##### Returns

`void`

---

### extensions

```ts
readonly extensions: object;
```

#### use()

```ts
use: (extension) => unknown;
```

##### Parameters

###### extension

[`PipelineExtension`](PipelineExtension.md)\&lt;`Pipeline`\&lt;`TRunOptions`, `TRunResult`, `TContext`, `TReporter`, `TBuildOptions`, `TArtifact`, `TFragmentInput`, `TFragmentOutput`, `TBuilderInput`, `TBuilderOutput`, `TDiagnostic`, `TFragmentKind`, `TBuilderKind`, `TFragmentHelper`, `TBuilderHelper`\&gt;, `TContext`, `TBuildOptions`, `TArtifact`\&gt;

##### Returns

`unknown`

---

### fragmentKind

```ts
readonly fragmentKind: TFragmentKind;
```

---

### ir

```ts
readonly ir: object;
```

#### use()

```ts
use: (helper) => void;
```

##### Parameters

###### helper

`TFragmentHelper`

##### Returns

`void`

---

### run()

```ts
run: (options) => MaybePromise<TRunResult>;
```

#### Parameters

##### options

`TRunOptions`

#### Returns

`MaybePromise`\&lt;`TRunResult`\&gt;

---

### use()

```ts
use: (helper) => void;
```

#### Parameters

##### helper

`TFragmentHelper` | `TBuilderHelper`

#### Returns

`void`
