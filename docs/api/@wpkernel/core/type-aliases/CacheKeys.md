[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / CacheKeys

# Type Alias: CacheKeys\&lt;TListParams\&gt;

```ts
type CacheKeys&lt;TListParams&gt; = object;
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
optional list: CacheKeyFn&lt;TListParams&gt;;
```

Cache key for list operations

---

### get?

```ts
optional get: CacheKeyFn&lt;string | number&gt;;
```

Cache key for single-item fetch

---

### create?

```ts
optional create: CacheKeyFn&lt;unknown&gt;;
```

Cache key for create operations (typically not cached)

---

### update?

```ts
optional update: CacheKeyFn&lt;string | number&gt;;
```

Cache key for update operations

---

### remove?

```ts
optional remove: CacheKeyFn&lt;string | number&gt;;
```

Cache key for delete operations
