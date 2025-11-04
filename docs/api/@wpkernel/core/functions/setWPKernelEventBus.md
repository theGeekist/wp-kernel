[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / setWPKernelEventBus

# Function: setWPKernelEventBus()

```ts
function setWPKernelEventBus(bus): void;
```

Replace the shared WP Kernel event bus. Intended for test suites that need to
inspect emitted events.

## Parameters

### bus

[`WPKernelEventBus`](../classes/WPKernelEventBus.md)

Custom event bus instance

## Returns

`void`
