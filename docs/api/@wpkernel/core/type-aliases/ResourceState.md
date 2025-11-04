[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceState

# Type Alias: ResourceState\&lt;T\&gt;

```ts
type ResourceState&lt;T&gt; = object;
```

## Type Parameters

### T

`T`

## Properties

### items

```ts
items: Record & lt;
(string | number, T & gt);
```

Map of items by ID.

---

### lists

```ts
lists: Record&lt;string, (string | number)[]&gt;;
```

List queries and their results.
Key is stringified query params, value is array of IDs.

---

### listMeta

```ts
listMeta: Record&lt;string, {
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
  status?: ResourceListStatus;
}&gt;;
```

List metadata (total count, pagination, etc).

---

### errors

```ts
errors: Record & lt;
(string, string & gt);
```

Error messages by cache key.
