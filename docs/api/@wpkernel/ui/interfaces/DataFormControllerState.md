[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / DataFormControllerState

# Interface: DataFormControllerState\<TResult\>

Represents the state of a data form submission.

## Type Parameters

### TResult

`TResult`

The type of the result returned by the form submission action.

## Properties

### inFlight

```ts
inFlight: number;
```

The number of in-flight submissions.

---

### status

```ts
status: 'idle' | 'running' | 'success' | 'error';
```

The current status of the form submission.

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
