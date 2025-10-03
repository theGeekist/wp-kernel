[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ListResponse

# Interface: ListResponse\<T\>

Defined in: [resource/types.ts:186](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L186)

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

Defined in: [resource/types.ts:188](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L188)

Array of resource entities

---

### total?

```ts
optional total: number;
```

Defined in: [resource/types.ts:190](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L190)

Total count of items (if available)

---

### nextCursor?

```ts
optional nextCursor: string;
```

Defined in: [resource/types.ts:192](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L192)

Pagination cursor for next page

---

### hasMore?

```ts
optional hasMore: boolean;
```

Defined in: [resource/types.ts:194](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L194)

Whether there are more pages
