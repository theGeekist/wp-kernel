[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / BuildCoreResourcePipelineHarnessOptions

# Interface: BuildCoreResourcePipelineHarnessOptions\<T, TQuery\>

Options for building a `CoreResourcePipelineHarness`.

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

The namespace for the reporter.

---

### resourceName?

```ts
readonly optional resourceName: string;
```

The name of the resource.

---

### pipelineFactory()?

```ts
readonly optional pipelineFactory: () => ResourcePipeline<T, TQuery>;
```

A factory function to create the resource pipeline.

#### Returns

`ResourcePipeline`\<`T`, `TQuery`\>
