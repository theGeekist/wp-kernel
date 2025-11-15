[**@wpkernel/core v0.12.2-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceStore

# Type Alias: ResourceStore\<T, TQuery\>

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

[`ResourceState`](ResourceState.md)\<`T`\> | `undefined`

##### action

`unknown`

#### Returns

[`ResourceState`](ResourceState.md)\<`T`\>

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

---

### controls?

```ts
optional controls: Record<string, (action) => unknown>;
```

Controls for handling async operations in generators.
