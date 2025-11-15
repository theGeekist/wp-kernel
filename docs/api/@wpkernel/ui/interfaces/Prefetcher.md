[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / Prefetcher

# Interface: Prefetcher\<TQuery\>

Interface for the prefetcher, which exposes stable cache prefetch helpers for a resource.

## Type Parameters

### TQuery

`TQuery` = `unknown`

## Properties

### prefetchGet

```ts
prefetchGet: PrefetchGet;
```

Prefetches a single item from the resource.

---

### prefetchList

```ts
prefetchList: PrefetchList<TQuery>;
```

Prefetches a list of items from the resource.
