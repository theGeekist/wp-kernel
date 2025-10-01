[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / CacheKeys

# Interface: CacheKeys

Defined in: [types.ts:90](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L90)

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

Defined in: [types.ts:92](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L92)

Cache key for list operations

---

### get?

```ts
optional get: CacheKeyFn<string | number>;
```

Defined in: [types.ts:94](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L94)

Cache key for single-item fetch

---

### create?

```ts
optional create: CacheKeyFn<unknown>;
```

Defined in: [types.ts:96](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L96)

Cache key for create operations (typically not cached)

---

### update?

```ts
optional update: CacheKeyFn<string | number>;
```

Defined in: [types.ts:98](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L98)

Cache key for update operations

---

### remove?

```ts
optional remove: CacheKeyFn<string | number>;
```

Defined in: [types.ts:100](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L100)

Cache key for delete operations
