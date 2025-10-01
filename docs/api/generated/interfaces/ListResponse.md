[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / ListResponse

# Interface: ListResponse\<T\>

Defined in: [types.ts:171](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L171)

List response with pagination metadata

## Type Parameters

### T

`T`

The resource entity type

## Properties

### items

```ts
items: T[];
```

Defined in: [types.ts:173](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L173)

Array of resource entities

---

### total?

```ts
optional total: number;
```

Defined in: [types.ts:175](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L175)

Total count of items (if available)

---

### nextCursor?

```ts
optional nextCursor: string;
```

Defined in: [types.ts:177](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L177)

Pagination cursor for next page

---

### hasMore?

```ts
optional hasMore: boolean;
```

Defined in: [types.ts:179](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L179)

Whether there are more pages
