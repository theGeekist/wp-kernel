[**@wpkernel/test-utils v0.12.1-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / flushAsync

# Function: flushAsync()

```ts
function flushAsync(options): Promise<void>;
```

Flushes the microtask queue and optionally advances Jest timers.

This is useful in tests to ensure all pending promises and microtasks are resolved.

## Parameters

### options

Options for flushing, either a number of iterations or an object.

`number` | [`FlushAsyncOptions`](../interfaces/FlushAsyncOptions.md)

## Returns

`Promise`\<`void`\>

A Promise that resolves after the microtask queue is flushed.
