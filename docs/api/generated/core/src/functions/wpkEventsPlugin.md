[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / wpkEventsPlugin

# Function: wpkEventsPlugin()

```ts
function wpkEventsPlugin(options): KernelReduxMiddleware;
```

Bridge kernel lifecycle events into WordPress middleware and notices.

The plugin mirrors action lifecycle and cache invalidation events onto
`wp.hooks` while optionally surfacing admin notices via the core notices
store. It returns a Redux middleware compatible with `@wordpress/data`.

## Parameters

### options

[`WPKernelEventsPluginOptions`](../@wpkernel/core/data/type-aliases/WPKernelEventsPluginOptions.md)

Kernel event wiring options

## Returns

`KernelReduxMiddleware`

Redux middleware with a `destroy()` teardown helper
