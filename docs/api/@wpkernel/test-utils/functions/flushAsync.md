[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / flushAsync

# Function: flushAsync()

```ts
function flushAsync(options): Promise&lt;void&gt;;
```

Flushes the microtask queue and optionally advances Jest timers.

This is useful in tests to ensure all pending promises and microtasks are resolved.

## Parameters

### options

Options for flushing, either a number of iterations or an object.

`number` | [`FlushAsyncOptions`](../interfaces/FlushAsyncOptions.md)

## Returns

`Promise`\&lt;`void`\&gt;

A Promise that resolves after the microtask queue is flushed.
