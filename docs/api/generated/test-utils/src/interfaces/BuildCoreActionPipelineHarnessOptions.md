[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / BuildCoreActionPipelineHarnessOptions

# Interface: BuildCoreActionPipelineHarnessOptions\&lt;TArgs, TResult\&gt;

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### namespace?

```ts
readonly optional namespace: string;
```

---

### runtime?

```ts
readonly optional runtime: RuntimeOverrides;
```

---

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () => ActionPipeline<TArgs, TResult>;
```

#### Returns

`ActionPipeline`\&lt;`TArgs`, `TResult`\&gt;
