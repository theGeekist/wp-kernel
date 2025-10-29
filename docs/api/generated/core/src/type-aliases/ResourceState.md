[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceState

# Type Alias: ResourceState\&lt;T\&gt;

```ts
type ResourceState<T> = object;
```

## Type Parameters

### T

`T`

## Properties

### items

```ts
items: Record<string | number, T>;
```

Map of items by ID.

---

### lists

```ts
lists: Record<string, (string | number)[]>;
```

List queries and their results.
Key is stringified query params, value is array of IDs.

---

### listMeta

```ts
listMeta: Record<
	string,
	{
		total?: number;
		hasMore?: boolean;
		nextCursor?: string;
		status?: ResourceListStatus;
	}
>;
```

List metadata (total count, pagination, etc).

---

### errors

```ts
errors: Record<string, string>;
```

Error messages by cache key.
