[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewInteractionState

# Type Alias: DataViewInteractionState<TQuery>

```ts
type DataViewInteractionState<TQuery> = object;
```

Snapshot of the current DataView bridge state exposed to the interactivity store.

The state mirrors the controller selection, the normalized view state used to
hydrate the client cache, and the derived query payload that consumers can use
with resource loaders.

## Type Parameters

### TQuery

`TQuery`

The query payload shape produced by the DataView controller.

## Properties

### query

```ts
query: TQuery;
```

---

### selection

```ts
selection: string[];
```

---

### view

```ts
view: DataViewChangedPayload['viewState'];
```
