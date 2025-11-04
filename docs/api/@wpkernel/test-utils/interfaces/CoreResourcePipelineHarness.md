[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / CoreResourcePipelineHarness

# Interface: CoreResourcePipelineHarness\&lt;T, TQuery\&gt;

A harness for testing resource pipelines.

## Type Parameters

### T

`T`

### TQuery

`TQuery`

## Properties

### pipeline

```ts
readonly pipeline: ResourcePipeline&lt;T, TQuery&gt;;
```

The resource pipeline instance.

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

### resourceName

```ts
readonly resourceName: string;
```

The name of the resource being tested.
