[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / DefineInteractionOptions

# Interface: DefineInteractionOptions\&lt;TEntity, TQuery, TStore, TActions\&gt;

Options accepted by `defineInteraction`.

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

### TStore

`TStore` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Properties

### actions?

```ts
readonly optional actions: TActions;
```

---

### autoHydrate?

```ts
readonly optional autoHydrate: boolean;
```

---

### feature

```ts
readonly feature: string;
```

---

### hydrateServerState()?

```ts
readonly optional hydrateServerState: (input) => void;
```

#### Parameters

##### input

[`HydrateServerStateInput`](HydrateServerStateInput.md)\&lt;`TEntity`, `TQuery`\&gt;

#### Returns

`void`

---

### namespace?

```ts
readonly optional namespace: string;
```

---

### registry?

```ts
readonly optional registry: WPKernelRegistry;
```

---

### resource

```ts
readonly resource: ResourceObject<TEntity, TQuery>;
```

---

### store?

```ts
readonly optional store: TStore;
```
