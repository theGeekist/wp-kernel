[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / DataFormControllerState

# Interface: DataFormControllerState\&lt;TResult\&gt;

Represents the state of a data form submission.

## Type Parameters

### TResult

`TResult`

The type of the result returned by the form submission action.

## Properties

### status

```ts
status: 'idle' | 'running' | 'success' | 'error';
```

The current status of the form submission.

---

### inFlight

```ts
inFlight: number;
```

The number of in-flight submissions.

---

### error?

```ts
optional error: WPKernelError;
```

Any error that occurred during submission.

---

### result?

```ts
optional result: TResult;
```

The result of the last successful submission.
