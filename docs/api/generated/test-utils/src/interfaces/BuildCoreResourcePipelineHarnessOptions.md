[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / BuildCoreResourcePipelineHarnessOptions

# Interface: BuildCoreResourcePipelineHarnessOptions\&lt;T, TQuery\&gt;

## Type Parameters

### T

`T`

### TQuery

`TQuery`

## Properties

### namespace?

```ts
readonly optional namespace: string;
```

---

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () => ResourcePipeline<T, TQuery>;
```

#### Returns

`ResourcePipeline`\&lt;`T`, `TQuery`\&gt;

---

### resourceName?

```ts
readonly optional resourceName: string;
```
