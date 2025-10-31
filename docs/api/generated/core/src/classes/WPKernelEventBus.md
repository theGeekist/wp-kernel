[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPKernelEventBus

# Class: WPKernelEventBus

Typed event bus used across the kernel to broadcast lifecycle events and
cache invalidation notices.

The bus automatically resolves a reporter so listener failures can be logged
during development while remaining silent in production or when reporters are
muted.

## Constructors

### Constructor

```ts
new WPKernelEventBus(): WPKernelEventBus;
```

#### Returns

`WPKernelEventBus`

## Methods

### emit()

```ts
emit<K>(event, payload): void;
```

Emit the specified event and execute every registered listener. Any
listener failures are reported via the resolved reporter when running
outside of production.

#### Type Parameters

##### K

`K` _extends_ keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### payload

[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]

#### Returns

`void`

---

### off()

```ts
off<K>(event, listener): void;
```

Remove a previously registered listener. Calling this method for a
listener that was never registered is a no-op.

#### Type Parameters

##### K

`K` _extends_ keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]\&gt;

#### Returns

`void`

---

### on()

```ts
on<K>(event, listener): () => void;
```

Register a listener that remains active until the returned teardown
function is called.

#### Type Parameters

##### K

`K` _extends_ keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]\&gt;

#### Returns

```ts
(): void;
```

##### Returns

`void`

---

### once()

```ts
once<K>(event, listener): () => void;
```

Register a listener that runs only once for the next occurrence of
the event and then tears itself down.

#### Type Parameters

##### K

`K` _extends_ keyof [`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`WPKernelEventMap`](../type-aliases/WPKernelEventMap.md)\[`K`\]\&gt;

#### Returns

```ts
(): void;
```

##### Returns

`void`
