[**WP Kernel API v0.10.0**](../../../../../../README.md)

---

[WP Kernel API](../../../../../../README.md) / [core/src](../../../../README.md) / [@wpkernel/core/data](../README.md) / WPKernelUIRuntime

# Interface: WPKernelUIRuntime

## Properties

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntime;
```

---

### dataviews?

```ts
optional dataviews: KernelDataViewsRuntime;
```

---

### events

```ts
events: WPKernelEventBus;
```

---

### invalidate()?

```ts
optional invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../../../../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../../../../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../../../../type-aliases/InvalidateOptions.md)

#### Returns

`void`

---

### kernel?

```ts
optional kernel: WPKInstance;
```

---

### namespace

```ts
namespace: string;
```

---

### options?

```ts
optional options: UIIntegrationOptions;
```

---

### registry?

```ts
optional registry: WPKernelRegistry;
```

---

### reporter

```ts
reporter: Reporter;
```
