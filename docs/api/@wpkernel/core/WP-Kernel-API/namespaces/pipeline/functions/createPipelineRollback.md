[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / createPipelineRollback

# Function: createPipelineRollback()

```ts
function createPipelineRollback(...tasks): 
  | () =&gt; MaybePromise&lt;void&gt;
  | undefined;
```

Creates a rollback function that runs a sequence of tasks in reverse order.

## Parameters

### tasks

...readonly [`TaskInput`](../type-aliases/TaskInput.md)[]

The tasks to run on rollback.

## Returns

  \| () =&gt; [`MaybePromise`](../type-aliases/MaybePromise.md)\&lt;`void`\&gt;
  \| `undefined`

A function that runs the tasks, or undefined if no tasks are provided.
