[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / UseResourceListResult

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
  | ListResponse<T>
  | undefined;
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
error: string | undefined;
```

Error message if the fetch failed, undefined otherwise
