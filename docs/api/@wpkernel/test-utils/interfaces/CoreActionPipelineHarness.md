[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / CoreActionPipelineHarness

# Interface: CoreActionPipelineHarness\&lt;TArgs, TResult\&gt;

A harness for testing action pipelines.

## Type Parameters

### TArgs

`TArgs`

### TResult

`TResult`

## Properties

### pipeline

```ts
readonly pipeline: ActionPipeline&lt;TArgs, TResult&gt;;
```

The action pipeline instance.

***

### reporter

```ts
readonly reporter: MemoryReporter;
```

The memory reporter instance.

***

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

***

### teardown()

```ts
teardown: () =&gt; void;
```

A function to clean up the harness.

#### Returns

`void`
