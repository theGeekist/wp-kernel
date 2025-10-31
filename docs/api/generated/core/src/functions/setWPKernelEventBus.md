[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / setWPKernelEventBus

# Function: setWPKernelEventBus()

```ts
function setWPKernelEventBus(bus): void;
```

Replace the shared kernel event bus. Intended for test suites that need to
inspect emitted events.

## Parameters

### bus

[`WPKernelEventBus`](../classes/WPKernelEventBus.md)

Custom event bus instance

## Returns

`void`
