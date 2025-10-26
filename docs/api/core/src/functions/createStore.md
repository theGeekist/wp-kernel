[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / createStore

# Function: createStore()

```ts
function createStore<T, TQuery>(config): ResourceStore<T, TQuery>;
```

Creates a resource store with selectors, actions, and resolvers.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations

## Parameters

### config

[`ResourceStoreConfig`](../type-aliases/ResourceStoreConfig.md)\&lt;`T`, `TQuery`\&gt;

Store configuration

## Returns

[`ResourceStore`](../type-aliases/ResourceStore.md)\&lt;`T`, `TQuery`\&gt;

Complete store descriptor

## Example

```typescript
import { createStore } from '@wpkernel/core/resource';
import { thing } from './resources/thing';

const thingStore = createStore({
	resource: thing,
	getId: (item) => item.id,
});
```
