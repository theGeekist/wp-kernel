[**@wpkernel/ui v0.12.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsRuntimeContext

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
readonly optional invalidate: (patterns, options?) => void;
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

### wpk?

```ts
readonly optional wpk: unknown;
```
