[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness\&lt;TArgs, TResult\&gt;

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### pipeline

```ts
readonly pipeline: ActionPipeline<TArgs, TResult>;
```

---

### reporter

```ts
readonly reporter: MemoryReporter;
```

---

### namespace

```ts
readonly namespace: string;
```

---

### teardown()

```ts
teardown: () => void;
```

#### Returns

`void`
