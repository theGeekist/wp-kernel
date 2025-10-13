[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-ui](../README.md) / UseResourceListResult

# Interface: UseResourceListResult\&lt;T\&gt;

Result shape for list resource hooks

## Type Parameters

### T

`T`

Entity type in the list

## Properties

### data

```ts
data:
  | undefined
| ListResponse<T>;
```

The fetched list response with items and metadata, or undefined if not yet loaded

---

### isLoading

```ts
isLoading: boolean;
```

True if the data is currently being fetched or resolved

---

### error

```ts
error: undefined | string;
```

Error message if the fetch failed, undefined otherwise
