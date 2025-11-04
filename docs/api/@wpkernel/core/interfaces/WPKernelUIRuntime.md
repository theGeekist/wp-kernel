[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / WPKernelUIRuntime

# Interface: WPKernelUIRuntime

## Properties

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

### events

```ts
events: WPKernelEventBus;
```

---

### kernel?

```ts
optional kernel: WPKInstance;
```

---

### registry?

```ts
optional registry: WPKernelRegistry;
```

---

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntime;
```

---

### invalidate()?

```ts
optional invalidate: (patterns, options?) =&gt; void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../type-aliases/InvalidateOptions.md)

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
optional dataviews: WPKernelDataViewsRuntime;
```
