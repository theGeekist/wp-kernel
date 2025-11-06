[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceStore

# Type Alias: ResourceStore\&lt;T, TQuery\&gt;

```ts
type ResourceStore&lt;T, TQuery&gt; = object;
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
selectors: ResourceSelectors & lt;
(T, TQuery & gt);
```

State selectors.

---

### actions

```ts
actions: ResourceActions & lt;
T & gt;
```

State actions.

---

### resolvers

```ts
resolvers: ResourceResolvers & lt;
(T, TQuery & gt);
```

Resolvers for async data fetching.

---

### reducer()

```ts
reducer: (state, action) => ResourceState & lt;
T & gt;
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
initialState: ResourceState & lt;
T & gt;
```

Initial state.

---

### controls?

```ts
optional controls: Record&lt;string, (action) => unknown&gt;;
```

Controls for handling async operations in generators.
