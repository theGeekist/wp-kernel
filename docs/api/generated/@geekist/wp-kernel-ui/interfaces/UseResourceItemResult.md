[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-ui](../README.md) / UseResourceItemResult

# Interface: UseResourceItemResult\&lt;T\&gt;

Result shape for single-item resource hooks

## Type Parameters

### T

`T`

Entity type returned by the resource

## Properties

### data

```ts
data: undefined | T;
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
error: undefined | string;
```

Error message if the fetch failed, undefined otherwise
