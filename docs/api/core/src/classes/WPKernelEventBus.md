[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPKernelEventBus

# Class: WPKernelEventBus

## Constructors

### Constructor

```ts
new WPKernelEventBus(): WPKernelEventBus;
```

#### Returns

`WPKernelEventBus`

## Methods

### on()

```ts
on<K>(event, listener): () => void;
```

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

### off()

```ts
off<K>(event, listener): void;
```

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

### emit()

```ts
emit<K>(event, payload): void;
```

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
