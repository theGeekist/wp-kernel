[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-ui](../README.md) / DataViewsRuntimeContext

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

### policies?

```ts
readonly optional policies: KernelUIPolicyRuntime;
```

---

### invalidate()?

```ts
readonly optional invalidate: (patterns, options?) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../../../kernel/src/type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../../../kernel/src/type-aliases/CacheKeyPattern.md)[]

##### options?

[`InvalidateOptions`](../../../kernel/src/type-aliases/InvalidateOptions.md)

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
