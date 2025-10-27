[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / DataViewsStandaloneRuntime

# Interface: DataViewsStandaloneRuntime

Runtime shape exposed to UI consumers (kernel or standalone).

## Extends

- [`DataViewsRuntimeContext`](DataViewsRuntimeContext.md)

## Properties

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`namespace`](DataViewsRuntimeContext.md#namespace)

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

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`invalidate`](DataViewsRuntimeContext.md#invalidate)

---

### registry?

```ts
readonly optional registry: unknown;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`registry`](DataViewsRuntimeContext.md#registry)

---

### reporter

```ts
readonly reporter: Reporter;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`reporter`](DataViewsRuntimeContext.md#reporter)

---

### kernel?

```ts
readonly optional kernel: unknown;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`kernel`](DataViewsRuntimeContext.md#kernel)

---

### dataviews

```ts
readonly dataviews: KernelDataViewsRuntime;
```

#### Overrides

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`dataviews`](DataViewsRuntimeContext.md#dataviews)

---

### policies?

```ts
readonly optional policies: WPKUIPolicyRuntime;
```

#### Overrides

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`policies`](DataViewsRuntimeContext.md#policies)
