[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / HydrateServerStateInput

# Interface: HydrateServerStateInput\&lt;TEntity, TQuery\&gt;

Input shape forwarded to custom hydration callbacks.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

## Properties

### registry?

```ts
readonly optional registry: WPKernelRegistry;
```

---

### resource

```ts
readonly resource: ResourceObject<TEntity, TQuery>;
```

---

### serverState

```ts
readonly serverState: object;
```

#### Index Signature

```ts
[key: string]: unknown
```

---

### syncCache

```ts
readonly syncCache: ResourceCacheSync<TEntity>;
```
