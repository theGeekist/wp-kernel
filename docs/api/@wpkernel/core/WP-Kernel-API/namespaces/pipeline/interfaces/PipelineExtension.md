[**WP Kernel API v0.11.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / PipelineExtension

# Interface: PipelineExtension\&lt;TPipeline, TContext, TOptions, TArtifact\&gt;

## Type Parameters

### TPipeline

`TPipeline`

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`

## Properties

### register()

```ts
register: (pipeline) =&gt; MaybePromise&lt;
  | void
| PipelineExtensionHook&lt;TContext, TOptions, TArtifact&gt;&gt;;
```

#### Parameters

##### pipeline

`TPipeline`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)\&lt;
\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\&lt;`TContext`, `TOptions`, `TArtifact`\&gt;\&gt;

---

### key?

```ts
readonly optional key: string;
```
