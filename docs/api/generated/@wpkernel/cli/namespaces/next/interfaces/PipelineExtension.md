[**WP Kernel API v0.7.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / PipelineExtension

# Interface: PipelineExtension

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
  | PipelineExtensionHook
  | Promise<
  | void
| PipelineExtensionHook>;
```

#### Parameters

##### pipeline

[`Pipeline`](Pipeline.md)

#### Returns

\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)
\| `Promise`\&lt;
\| `void`
\| [`PipelineExtensionHook`](../type-aliases/PipelineExtensionHook.md)\&gt;
