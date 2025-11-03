[**WP Kernel API v0.10.0**](../../../README.md)

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

### errors

```ts
errors: Record<string, string>;
```

Error messages by cache key.

---

### items

```ts
items: Record<string | number, T>;
```

Map of items by ID.

---

### listMeta

```ts
listMeta: Record<
	string,
	{
		hasMore?: boolean;
		nextCursor?: string;
		status?: ResourceListStatus;
		total?: number;
	}
>;
```

List metadata (total count, pagination, etc).

---

### lists

```ts
lists: Record<string, (string | number)[]>;
```

List queries and their results.
Key is stringified query params, value is array of IDs.
