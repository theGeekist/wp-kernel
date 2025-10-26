[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / CacheKeys

# Type Alias: CacheKeys\&lt;TListParams\&gt;

```ts
type CacheKeys<TListParams> = object;
```

Cache key generators for all CRUD operations

## Example

```ts
{
  list: (q) => ['thing', 'list', q?.search, q?.page],
  get: (id) => ['thing', 'get', id]
}
```

## Type Parameters

### TListParams

`TListParams` = `unknown`

## Properties

### list?

```ts
optional list: CacheKeyFn<TListParams>;
```

Cache key for list operations

---

### get?

```ts
optional get: CacheKeyFn<string | number>;
```

Cache key for single-item fetch

---

### create?

```ts
optional create: CacheKeyFn<unknown>;
```

Cache key for create operations (typically not cached)

---

### update?

```ts
optional update: CacheKeyFn<string | number>;
```

Cache key for update operations

---

### remove?

```ts
optional remove: CacheKeyFn<string | number>;
```

Cache key for delete operations
