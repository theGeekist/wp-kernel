[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / UseResourceItemResult

# Interface: UseResourceItemResult\&lt;T\&gt;

Result shape for single-item resource hooks

## Type Parameters

### T

`T`

Entity type returned by the resource

## Properties

### data

```ts
data: T | undefined;
```

The fetched entity, or undefined if not yet loaded

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
