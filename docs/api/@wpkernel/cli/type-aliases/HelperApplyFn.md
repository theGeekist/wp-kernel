[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / HelperApplyFn

# Type Alias: HelperApplyFn<TContext, TInput, TOutput, TReporter>

```ts
type HelperApplyFn<TContext, TInput, TOutput, TReporter> = (
	options,
	next?
) => MaybePromise<void>;
```

Function signature for a pipeline helper's apply method.

This function is responsible for transforming the pipeline's input and output.
It can optionally call `next()` to pass control to the next helper in the pipeline.

## Type Parameters

### TContext

`TContext`

The type of the pipeline context.

### TInput

`TInput`

The type of the input artifact.

### TOutput

`TOutput`

The type of the output artifact.

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

The type of the reporter used for logging.

## Parameters

### options

[`HelperApplyOptions`](../interfaces/HelperApplyOptions.md)<`TContext`, `TInput`, `TOutput`, `TReporter`>

Options for the apply function, including context, input, output, and reporter.

### next?

() => `MaybePromise`<`void`>

Optional function to call the next helper in the pipeline.

## Returns

`MaybePromise`<`void`>

A promise that resolves when the helper has finished its work.
