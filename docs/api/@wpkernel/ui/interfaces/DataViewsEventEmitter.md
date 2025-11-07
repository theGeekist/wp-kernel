[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsEventEmitter

# Interface: DataViewsEventEmitter

## Properties

### registered()

```ts
registered: (payload) => void;
```

#### Parameters

##### payload

[`DataViewRegisteredPayload`](../type-aliases/DataViewRegisteredPayload.md)

#### Returns

`void`

---

### unregistered()

```ts
unregistered: (payload) => void;
```

#### Parameters

##### payload

[`DataViewRegisteredPayload`](../type-aliases/DataViewRegisteredPayload.md)

#### Returns

`void`

---

### viewChanged()

```ts
viewChanged: (payload) => void;
```

#### Parameters

##### payload

[`DataViewChangedPayload`](../type-aliases/DataViewChangedPayload.md)

#### Returns

`void`

---

### actionTriggered()

```ts
actionTriggered: (payload) => void;
```

#### Parameters

##### payload

[`DataViewActionTriggeredPayload`](../type-aliases/DataViewActionTriggeredPayload.md)

#### Returns

`void`

---

### permissionDenied()

```ts
permissionDenied: (payload) => void;
```

#### Parameters

##### payload

[`DataViewPermissionDeniedPayload`](../type-aliases/DataViewPermissionDeniedPayload.md)

#### Returns

`void`

---

### fetchFailed()

```ts
fetchFailed: (payload) => void;
```

#### Parameters

##### payload

[`DataViewFetchFailedPayload`](../type-aliases/DataViewFetchFailedPayload.md)

#### Returns

`void`

---

### boundaryChanged()

```ts
boundaryChanged: (payload) => void;
```

#### Parameters

##### payload

[`DataViewBoundaryTransitionPayload`](../type-aliases/DataViewBoundaryTransitionPayload.md)

#### Returns

`void`
