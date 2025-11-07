[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewInteractionResult

# Interface: DataViewInteractionResult\<TItem, TQuery\>

Contract returned by [createDataViewInteraction](../functions/createDataViewInteraction.md) that exposes the controller,
underlying interaction, and convenience helpers to inspect and mutate the bridge state.

## Extends

- `DefinedInteraction`\<`InteractivityStoreResult`\>

## Type Parameters

### TItem

`TItem`

The resource record type handled by the DataView controller.

### TQuery

`TQuery`

The query payload shape produced by the DataView controller.

## Properties

### controller

```ts
readonly controller: ResourceDataViewController<TItem, TQuery>;
```

The resolved DataView controller bound to the interaction.

---

### setSelection()

```ts
readonly setSelection: (selection) => void;
```

Updates the mirrored selection state. Useful for synchronising custom UI
elements that mutate the DataView selection outside controller events.

#### Parameters

##### selection

(`string` \| `number`)[]

#### Returns

`void`

---

### getState()

```ts
readonly getState: () => DataViewInteractionState<TQuery>;
```

Returns the latest computed DataView interaction state.

#### Returns

[`DataViewInteractionState`](../type-aliases/DataViewInteractionState.md)\<`TQuery`\>

---

### teardown()

```ts
readonly teardown: () => void;
```

Restores controller emitters to their original implementations.

#### Returns

`void`

---

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

```ts
DefinedInteraction.namespace;
```

---

### store

```ts
readonly store: TStoreResult;
```

#### Inherited from

```ts
DefinedInteraction.store;
```

---

### syncServerState()

```ts
readonly syncServerState: () => void;
```

#### Returns

`void`

#### Inherited from

```ts
DefinedInteraction.syncServerState;
```

---

### getServerState()

```ts
readonly getServerState: () => object;
```

#### Returns

`object`

#### Inherited from

```ts
DefinedInteraction.getServerState;
```
