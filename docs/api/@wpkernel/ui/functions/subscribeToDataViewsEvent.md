[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / subscribeToDataViewsEvent

# Function: subscribeToDataViewsEvent()

```ts
function subscribeToDataViewsEvent<TName>(
	runtime,
	eventName,
	listener,
	options?
): () => void;
```

Subscribes to a specific DataViews event and optionally bridges it to WordPress hooks.

## Type Parameters

### TName

`TName` _extends_ keyof [`DataViewsEventPayloadMap`](../type-aliases/DataViewsEventPayloadMap.md)

## Parameters

### runtime

`ObservableRuntime`

A DataViews controller or runtime context.

### eventName

`TName`

The event name to subscribe to.

### listener

`Listener`\<`TName`\>

Callback invoked when the event fires.

### options?

[`SubscribeToDataViewsEventOptions`](../interfaces/SubscribeToDataViewsEventOptions.md) = `{}`

Optional configuration.

## Returns

Cleanup function that unsubscribes the listener.

```ts
(): void;
```

### Returns

`void`

## Example

```ts
const unsubscribe = subscribeToDataViewsEvent(
	runtime.dataviews,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
	(payload) => console.log('View changed', payload)
);
```
