[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / InvalidateOptions

# Type Alias: InvalidateOptions

```ts
type InvalidateOptions = object;
```

Options for invalidate function

## Properties

### storeKey?

```ts
optional storeKey: string;
```

Store key to target (e.g., 'my-plugin/thing')
If not provided, invalidates across all registered stores

---

### emitEvent?

```ts
optional emitEvent: boolean;
```

Whether to emit the cache.invalidated event

#### Default

```ts
true;
```

---

### registry?

```ts
optional registry: WPKernelRegistry;
```

Registry to operate against instead of relying on global getWPData().

---

### reporter?

```ts
optional reporter: Reporter;
```

Reporter override for cache instrumentation.

---

### namespace?

```ts
optional namespace: string;
```

Optional namespace for logging context.

---

### resourceName?

```ts
optional resourceName: string;
```

Optional resource name for logging context.
