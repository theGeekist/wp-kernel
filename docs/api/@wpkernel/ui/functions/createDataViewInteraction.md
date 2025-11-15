[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / createDataViewInteraction

# Function: createDataViewInteraction()

```ts
function createDataViewInteraction<TItem, TQuery, TActions>(
	options
): DataViewInteractionResult<TItem, TQuery>;
```

Creates a typed interactivity binding for a DataView controller.

## Type Parameters

### TItem

`TItem`

The resource record type handled by the DataView controller.

### TQuery

`TQuery`

The query payload shape produced by the DataView controller.

### TActions

`TActions` _extends_ `InteractionActionsRecord` \| `undefined` = `InteractionActionsRecord`

Optional interactivity actions map to augment the interaction.

## Parameters

### options

[`CreateDataViewInteractionOptions`](../interfaces/CreateDataViewInteractionOptions.md)\<`TItem`, `TQuery`, `TActions`\>

## Returns

[`DataViewInteractionResult`](../interfaces/DataViewInteractionResult.md)\<`TItem`, `TQuery`\>

## Example

```ts
const runtime = createDataViewsRuntime({ namespace: 'acme/jobs' });
const interaction = createDataViewInteraction({
	runtime,
	feature: 'jobs-table',
	resourceName: 'jobs',
});

const { store } = interaction;
// store.state.selection => []
```
