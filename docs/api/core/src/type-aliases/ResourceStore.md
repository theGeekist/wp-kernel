[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceStore

# Type Alias: ResourceStore\&lt;T, TQuery\&gt;

```ts
type ResourceStore<T, TQuery> = object;
```

Complete store descriptor returned by createStore.

## Type Parameters

### T

`T`

The resource entity type

### TQuery

`TQuery` = `unknown`

The query parameter type for list operations

## Properties

### storeKey

```ts
storeKey: string;
```

Store key for registration with @wordpress/data.

---

### selectors

```ts
selectors: ResourceSelectors<T, TQuery>;
```

State selectors.

---

### actions

```ts
actions: ResourceActions<T>;
```

State actions.

---

### resolvers

```ts
resolvers: ResourceResolvers<T, TQuery>;
```

Resolvers for async data fetching.

---

### reducer()

```ts
reducer: (state, action) => ResourceState<T>;
```

Reducer function for state updates.

#### Parameters

##### state

[`ResourceState`](ResourceState.md)\&lt;`T`\&gt; | `undefined`

##### action

`unknown`

#### Returns

[`ResourceState`](ResourceState.md)\&lt;`T`\&gt;

---

### initialState

```ts
initialState: ResourceState<T>;
```

Initial state.

---

### controls?

```ts
optional controls: Record<string, (action) => unknown>;
```

Controls for handling async operations in generators.
