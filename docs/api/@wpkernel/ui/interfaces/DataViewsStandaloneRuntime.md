[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsStandaloneRuntime

# Interface: DataViewsStandaloneRuntime

A standalone runtime for DataViews.

## Extends

- [`DataViewsRuntimeContext`](DataViewsRuntimeContext.md)

## Properties

### dataviews

```ts
readonly dataviews: WPKernelDataViewsRuntime;
```

The DataViews runtime.

#### Overrides

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`dataviews`](DataViewsRuntimeContext.md#dataviews)

---

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`namespace`](DataViewsRuntimeContext.md#namespace)

---

### reporter

```ts
readonly reporter: Reporter;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`reporter`](DataViewsRuntimeContext.md#reporter)

---

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

The capability runtime.

#### Overrides

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`capabilities`](DataViewsRuntimeContext.md#capabilities)

---

### invalidate()?

```ts
readonly optional invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

##### options?

`InvalidateOptions`

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

### kernel?

```ts
readonly optional kernel: unknown;
```

#### Inherited from

[`DataViewsRuntimeContext`](DataViewsRuntimeContext.md).[`kernel`](DataViewsRuntimeContext.md#kernel)
