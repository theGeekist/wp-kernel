[**WP Kernel API v0.11.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / createPipelineCommit

# Function: createPipelineCommit()

```ts
function createPipelineCommit(...tasks):
  | () =&gt; MaybePromise&lt;void&gt;
  | undefined;
```

Creates a commit function that runs a sequence of tasks.

## Parameters

### tasks

...readonly [`TaskInput`](../type-aliases/TaskInput.md)[]

The tasks to run on commit.

## Returns

\| () =&gt; [`MaybePromise`](../type-aliases/MaybePromise.md)\&lt;`void`\&gt;
\| `undefined`

A function that runs the tasks, or undefined if no tasks are provided.
