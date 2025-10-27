[**WP Kernel API v0.7.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineExtension

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

### key?

```ts
readonly optional key: string;
```

---

### register()

```ts
register: (pipeline) =>
  | void
  | PipelineExtensionHook<TContext, TOptions, TArtifact>
  | Promise<
  | void
| PipelineExtensionHook<TContext, TOptions, TArtifact>>;
```

#### Parameters

##### pipeline

`TPipeline`

#### Returns

\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\&lt;`TContext`, `TOptions`, `TArtifact`\&gt;
\| `Promise`\&lt;
\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\&lt;`TContext`, `TOptions`, `TArtifact`\&gt;\&gt;
