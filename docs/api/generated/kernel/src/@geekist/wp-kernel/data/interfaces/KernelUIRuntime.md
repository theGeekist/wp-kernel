[**WP Kernel API v0.3.0**](../../../../../../README.md)

---

[WP Kernel API](../../../../../../README.md) / [kernel/src](../../../../README.md) / [@geekist/wp-kernel/data](../README.md) / KernelUIRuntime

# Interface: KernelUIRuntime

## Properties

### kernel?

```ts
optional kernel: KernelInstance;
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
optional registry: KernelRegistry;
```

---

### events

```ts
events: KernelEventBus;
```

---

### policies?

```ts
optional policies: KernelUIPolicyRuntime;
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
