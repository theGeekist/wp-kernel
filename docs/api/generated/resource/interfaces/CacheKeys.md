[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / CacheKeys

# Interface: CacheKeys

Defined in: [resource/types.ts:91](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L91)

Cache key generators for all CRUD operations

## Example

```ts
{
  list: (q) => ['thing', 'list', q?.search, q?.page],
  get: (id) => ['thing', 'get', id]
}
```

## Properties

### list?

```ts
optional list: CacheKeyFn<unknown>;
```

Defined in: [resource/types.ts:93](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L93)

Cache key for list operations

---

### get?

```ts
optional get: CacheKeyFn<string | number>;
```

Defined in: [resource/types.ts:95](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L95)

Cache key for single-item fetch

---

### create?

```ts
optional create: CacheKeyFn<unknown>;
```

Defined in: [resource/types.ts:97](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L97)

Cache key for create operations (typically not cached)

---

### update?

```ts
optional update: CacheKeyFn<string | number>;
```

Defined in: [resource/types.ts:99](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L99)

Cache key for update operations

---

### remove?

```ts
optional remove: CacheKeyFn<string | number>;
```

Defined in: [resource/types.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L101)

Cache key for delete operations
