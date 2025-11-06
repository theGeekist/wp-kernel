[**@wpkernel/e2e-utils v0.11.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / StoreUtils

# Type Alias: StoreUtils\&lt;T\&gt;

```ts
type StoreUtils&lt;T&gt; = object;
```

Store utilities for waiting on resolvers and state

## Type Parameters

### T

`T` = `unknown`

## Properties

### wait()

```ts
wait: &lt;R&gt;(selector, timeout?) => Promise&lt;R&gt;;
```

Wait for store selector to return truthy value

#### Type Parameters

##### R

`R`

#### Parameters

##### selector

(`state`) => `R`

Function that receives store state and returns data

##### timeout?

`number`

Max wait time in ms (default: 5000)

#### Returns

`Promise`\&lt;`R`\&gt;

Resolved data from selector

---

### invalidate()

```ts
invalidate: () => Promise&lt;void&gt;;
```

Invalidate store cache to trigger refetch

#### Returns

`Promise`\&lt;`void`\&gt;

---

### getState()

```ts
getState: () => Promise & lt;
T & gt;
```

Get current store state

#### Returns

`Promise`\&lt;`T`\&gt;

Current state object
