[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness\<TArgs, TResult\>

A harness for testing action pipelines.

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

The action pipeline instance.

---

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

---

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

---

### teardown()

```ts
teardown: () => void;
```

A function to clean up the harness.

#### Returns

`void`
