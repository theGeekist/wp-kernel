[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / DefineInteractionOptions

# Interface: DefineInteractionOptions\<TEntity, TQuery, TStore, TActions\>

Options accepted by `defineInteraction`.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

### TStore

`TStore` _extends_ `Record`\<`string`, `unknown`\>

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Properties

### resource

```ts
readonly resource: ResourceObject<TEntity, TQuery>;
```

---

### feature

```ts
readonly feature: string;
```

---

### store?

```ts
readonly optional store: TStore;
```

---

### actions?

```ts
readonly optional actions: TActions;
```

---

### registry?

```ts
readonly optional registry: WPKernelRegistry;
```

---

### namespace?

```ts
readonly optional namespace: string;
```

---

### autoHydrate?

```ts
readonly optional autoHydrate: boolean;
```

---

### hydrateServerState()?

```ts
readonly optional hydrateServerState: (input) => void;
```

#### Parameters

##### input

[`HydrateServerStateInput`](HydrateServerStateInput.md)\<`TEntity`, `TQuery`\>

#### Returns

`void`
