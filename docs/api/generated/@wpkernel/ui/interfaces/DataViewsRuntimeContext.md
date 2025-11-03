[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / DataViewsRuntimeContext

# Interface: DataViewsRuntimeContext

Runtime shape exposed to UI consumers (kernel or standalone).

## Extended by

- [`DataViewsStandaloneRuntime`](DataViewsStandaloneRuntime.md)

## Properties

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

---

### dataviews

```ts
readonly dataviews: DataViewsControllerRuntime;
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

### kernel?

```ts
readonly optional kernel: unknown;
```

---

### namespace

```ts
readonly namespace: string;
```

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
