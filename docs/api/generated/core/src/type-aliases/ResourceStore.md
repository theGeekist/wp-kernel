[**WP Kernel API v0.10.0**](../../../README.md)

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

### actions

```ts
actions: ResourceActions<T>;
```

State actions.

---

### controls?

```ts
optional controls: Record<string, (action) => unknown>;
```

Controls for handling async operations in generators.

---

### initialState

```ts
initialState: ResourceState<T>;
```

Initial state.

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

### resolvers

```ts
resolvers: ResourceResolvers<T, TQuery>;
```

Resolvers for async data fetching.

---

### selectors

```ts
selectors: ResourceSelectors<T, TQuery>;
```

State selectors.

---

### storeKey

```ts
storeKey: string;
```

Store key for registration with @wordpress/data.
