[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ensureControllerRuntime

# Function: ensureControllerRuntime()

```ts
function ensureControllerRuntime(candidate): DataViewsControllerRuntime;
```

Ensures that the provided runtime is a valid `DataViewsControllerRuntime`.

Throws a `DataViewsConfigurationError` if the runtime is invalid.

## Parameters

### candidate

The runtime candidate to validate.

[`WPKernelDataViewsRuntime`](../interfaces/WPKernelDataViewsRuntime.md) | [`DataViewsControllerRuntime`](../interfaces/DataViewsControllerRuntime.md)

## Returns

[`DataViewsControllerRuntime`](../interfaces/DataViewsControllerRuntime.md)

The validated `DataViewsControllerRuntime` instance.
