[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ReduxMiddleware

# Type Alias: ReduxMiddleware()\&lt;TState\&gt;

```ts
type ReduxMiddleware&lt;TState&gt; = (api) => (next) => (action) => unknown;
```

Redux compatible middleware type without depending on redux package.

## Type Parameters

### TState

`TState` = `unknown`

## Parameters

### api

[`ReduxMiddlewareAPI`](ReduxMiddlewareAPI.md)\&lt;`TState`\&gt;

## Returns

```ts
(next): (action) => unknown;
```

### Parameters

#### next

[`ReduxDispatch`](ReduxDispatch.md)

### Returns

```ts
(action): unknown;
```

#### Parameters

##### action

`unknown`

#### Returns

`unknown`
