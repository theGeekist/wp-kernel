[**@wpkernel/pipeline v0.11.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / PipelineExtension

# Interface: PipelineExtension\<TPipeline, TContext, TOptions, TArtifact\>

A pipeline extension descriptor.

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
register: (pipeline) => MaybePromise<
  | void
| PipelineExtensionHook<TContext, TOptions, TArtifact>>;
```

#### Parameters

##### pipeline

`TPipeline`

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)\<
\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\<`TContext`, `TOptions`, `TArtifact`\>\>

---

### key?

```ts
readonly optional key: string;
```
