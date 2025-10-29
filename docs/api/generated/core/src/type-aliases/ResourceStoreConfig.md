[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceStoreConfig

# Type Alias: ResourceStoreConfig\&lt;T, TQuery\&gt;

```ts
type ResourceStoreConfig<T, TQuery> = object & ResourceStoreOptions<T, TQuery>;
```

Store configuration for a resource.

## Type Declaration

### resource

```ts
resource: ResourceObject<T, TQuery>;
```

The resource object this store is for.

### reporter?

```ts
optional reporter: Reporter;
```

Reporter instance used for store instrumentation.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations
