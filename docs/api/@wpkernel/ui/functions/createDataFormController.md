[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / createDataFormController

# Function: createDataFormController()

```ts
function createDataFormController<TInput, TResult, TQuery>(
	options
): () => UseDataFormController<TResult>;
```

Creates a React hook for managing data form submissions.

This function returns a custom React hook (`useDataFormController`) that can be used
to handle form submissions, action invocation, and state management (loading, error, success).
It integrates with `useAction` for robust action handling and can automatically invalidate
resource caches.

## Type Parameters

### TInput

`TInput`

The type of the input arguments for the form's action.

### TResult

`TResult`

The type of the result returned by the form's action.

### TQuery

`TQuery`

The type of the query parameters for the associated resource (if any).

## Parameters

### options

[`CreateDataFormControllerOptions`](../interfaces/CreateDataFormControllerOptions.md)<`TInput`, `TResult`, `TQuery`>

Configuration options for the data form controller.

## Returns

A function that returns a `UseDataFormController` hook.

```ts
(): UseDataFormController<TResult>;
```

### Returns

[`UseDataFormController`](../interfaces/UseDataFormController.md)<`TResult`>
