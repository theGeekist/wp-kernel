[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / FlushAsyncOptions

# Interface: FlushAsyncOptions

Options for the `flushAsync` function.

## Properties

### iterations?

```ts
optional iterations: number;
```

The number of microtask queue flushes to perform. Defaults to 2.

---

### runAllTimers?

```ts
optional runAllTimers: boolean;
```

Whether to run all pending timers after flushing microtasks.
