[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / HydrateServerStateInput

# Interface: HydrateServerStateInput\&lt;TEntity, TQuery\&gt;

Input shape forwarded to custom hydration callbacks.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

## Properties

### serverState

```ts
readonly serverState: object;
```

#### Index Signature

```ts
[key: string]: unknown
```

---

### resource

```ts
readonly resource: ResourceObject&lt;TEntity, TQuery&gt;;
```

---

### syncCache

```ts
readonly syncCache: ResourceCacheSync&lt;TEntity&gt;;
```

---

### registry?

```ts
readonly optional registry: WPKernelRegistry;
```
