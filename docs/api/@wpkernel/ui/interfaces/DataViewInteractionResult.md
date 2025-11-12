[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

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

---

### getState()

```ts
readonly getState: () => DataViewInteractionState<TQuery>;
```

Returns the latest computed DataView interaction state.

#### Returns

[`DataViewInteractionState`](../type-aliases/DataViewInteractionState.md)\<`TQuery`\>

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

### teardown()

```ts
readonly teardown: () => void;
```

Restores controller emitters to their original implementations.

#### Returns

`void`
