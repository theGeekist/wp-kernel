[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / DataViewsRuntimeContext

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

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

---

### invalidate()?

```ts
readonly optional invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../../../core/src/type-aliases/InvalidateOptions.md)

#### Returns

`void`

---

### registry?

```ts
readonly optional registry: unknown;
```

---

### reporter

```ts
readonly reporter: Reporter;
```

---

### kernel?

```ts
readonly optional kernel: unknown;
```
