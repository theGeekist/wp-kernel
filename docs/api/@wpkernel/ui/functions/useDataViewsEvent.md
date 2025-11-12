[**@wpkernel/ui v0.12.1-beta.3**](../README.md)

---

[@wpkernel/ui](../README.md) / useDataViewsEvent

# Function: useDataViewsEvent()

```ts
function useDataViewsEvent<TName>(runtime, eventName, listener, options): void;
```

## Type Parameters

### TName

`TName` _extends_ keyof [`DataViewsEventPayloadMap`](../type-aliases/DataViewsEventPayloadMap.md)

## Parameters

### runtime

`ObservableRuntime`

### eventName

`TName`

### listener

`Listener`\<`TName`\>

### options

[`SubscribeToDataViewsEventOptions`](../interfaces/SubscribeToDataViewsEventOptions.md) = `{}`

## Returns

`void`
