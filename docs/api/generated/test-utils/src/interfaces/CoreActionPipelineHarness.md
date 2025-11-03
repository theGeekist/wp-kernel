[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness\&lt;TArgs, TResult\&gt;

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### namespace

```ts
readonly namespace: string;
```

---

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

### teardown()

```ts
teardown: () => void;
```

#### Returns

`void`
