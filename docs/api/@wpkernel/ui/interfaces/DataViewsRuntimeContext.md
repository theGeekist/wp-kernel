[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / DataViewsRuntimeContext

# Interface: DataViewsRuntimeContext

Runtime shape exposed to UI consumers (kernel or standalone).

## Extended by

- [`DataViewsStandaloneRuntime`](DataViewsStandaloneRuntime.md)

## Properties

### namespace

```ts
readonly namespace: string;
```

---

### dataviews

```ts
readonly dataviews: DataViewsControllerRuntime;
```

---

### reporter

```ts
readonly reporter: Reporter;
```

---

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

---

### invalidate()?

```ts
readonly optional invalidate: (patterns, options?) =&gt; void;
```

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

##### options?

`InvalidateOptions`

#### Returns

`void`

---

### registry?

```ts
readonly optional registry: unknown;
```

---

### kernel?

```ts
readonly optional kernel: unknown;
```
