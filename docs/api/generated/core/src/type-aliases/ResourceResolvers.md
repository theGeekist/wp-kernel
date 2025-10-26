[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceResolvers

# Type Alias: ResourceResolvers\&lt;\_T, TQuery\&gt;

```ts
type ResourceResolvers<_T, TQuery> = object & Record<string, AnyFn>;
```

Resolvers for a resource store.

## Type Declaration

### getItem()

```ts
getItem: (id) => Generator<unknown, void, unknown>;
```

Resolver for getItem selector.
Fetches a single item by ID if not already in state.

#### Parameters

##### id

Item ID

`string` | `number`

#### Returns

`Generator`\&lt;`unknown`, `void`, `unknown`\&gt;

### getItems()

```ts
getItems: (query?) => Generator<unknown, void, unknown>;
```

Resolver for getItems selector.
Fetches a list of items if not already in state.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`\&lt;`unknown`, `void`, `unknown`\&gt;

### getList()

```ts
getList: (query?) => Generator<unknown, void, unknown>;
```

Resolver for getList selector.
Same as getItems but includes metadata.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Generator`\&lt;`unknown`, `void`, `unknown`\&gt;

## Type Parameters

### \_T

`_T`

The resource entity type (unused, for type inference in store creation)

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations
