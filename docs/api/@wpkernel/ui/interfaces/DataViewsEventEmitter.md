[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / DataViewsEventEmitter

# Interface: DataViewsEventEmitter

## Properties

### registered()

```ts
registered: (payload) =&gt; void;
```

#### Parameters

##### payload

[`DataViewRegisteredPayload`](../type-aliases/DataViewRegisteredPayload.md)

#### Returns

`void`

---

### unregistered()

```ts
unregistered: (payload) =&gt; void;
```

#### Parameters

##### payload

[`DataViewRegisteredPayload`](../type-aliases/DataViewRegisteredPayload.md)

#### Returns

`void`

---

### viewChanged()

```ts
viewChanged: (payload) =&gt; void;
```

#### Parameters

##### payload

[`DataViewChangedPayload`](../type-aliases/DataViewChangedPayload.md)

#### Returns

`void`

---

### actionTriggered()

```ts
actionTriggered: (payload) =&gt; void;
```

#### Parameters

##### payload

[`DataViewActionTriggeredPayload`](../type-aliases/DataViewActionTriggeredPayload.md)

#### Returns

`void`
