[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ListResponse

# Interface: ListResponse\<T\>

Defined in: [resource/types.ts:187](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L187)

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

Defined in: [resource/types.ts:189](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L189)

Array of resource entities

---

### total?

```ts
optional total: number;
```

Defined in: [resource/types.ts:191](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L191)

Total count of items (if available)

---

### nextCursor?

```ts
optional nextCursor: string;
```

Defined in: [resource/types.ts:193](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L193)

Pagination cursor for next page

---

### hasMore?

```ts
optional hasMore: boolean;
```

Defined in: [resource/types.ts:195](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L195)

Whether there are more pages
