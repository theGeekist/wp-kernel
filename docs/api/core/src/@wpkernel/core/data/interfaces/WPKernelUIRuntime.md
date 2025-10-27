[**WP Kernel API v0.6.0**](../../../../../../README.md)

---

[WP Kernel API](../../../../../../README.md) / [core/src](../../../../README.md) / [@wpkernel/core/data](../README.md) / WPKernelUIRuntime

# Interface: WPKernelUIRuntime

## Properties

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

### reporter

```ts
reporter: Reporter;
```

---

### registry?

```ts
optional registry: WPKernelRegistry;
```

---

### events

```ts
events: WPKernelEventBus;
```

---

### policies?

```ts
optional policies: WPKUIPolicyRuntime;
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

### options?

```ts
optional options: UIIntegrationOptions;
```

---

### dataviews?

```ts
optional dataviews: KernelDataViewsRuntime;
```
