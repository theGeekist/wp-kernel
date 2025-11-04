[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PipelineExtension

# Interface: PipelineExtension

Represents a pipeline extension.

## Properties

### register()

```ts
register: (pipeline) =&gt;
  | void
  | PipelineExtensionHook
  | Promise&lt;
  | void
| PipelineExtensionHook&gt;;
```

The registration function for the extension.
It receives the pipeline instance and can register hooks or modify its behavior.

#### Parameters

##### pipeline

[`Pipeline`](../type-aliases/Pipeline.md)

The pipeline instance to register with.

#### Returns

\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)
\| `Promise`\&lt;
\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\&gt;

An optional `PipelineExtensionHook` or a promise resolving to one.

---

### key?

```ts
readonly optional key: string;
```

Optional: A unique key for the extension.
