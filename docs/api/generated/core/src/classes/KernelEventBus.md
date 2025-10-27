[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / KernelEventBus

# Class: KernelEventBus

## Constructors

### Constructor

```ts
new KernelEventBus(): KernelEventBus;
```

#### Returns

`KernelEventBus`

## Methods

### on()

```ts
on<K>(event, listener): () => void;
```

#### Type Parameters

##### K

`K` _extends_ keyof [`KernelEventMap`](../type-aliases/KernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`KernelEventMap`](../type-aliases/KernelEventMap.md)\[`K`\]\&gt;

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

`K` _extends_ keyof [`KernelEventMap`](../type-aliases/KernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`KernelEventMap`](../type-aliases/KernelEventMap.md)\[`K`\]\&gt;

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

`K` _extends_ keyof [`KernelEventMap`](../type-aliases/KernelEventMap.md)

#### Parameters

##### event

`K`

##### listener

`Listener`\&lt;[`KernelEventMap`](../type-aliases/KernelEventMap.md)\[`K`\]\&gt;

#### Returns

`void`

---

### emit()

```ts
emit<K>(event, payload): void;
```

#### Type Parameters

##### K

`K` _extends_ keyof [`KernelEventMap`](../type-aliases/KernelEventMap.md)

#### Parameters

##### event

`K`

##### payload

[`KernelEventMap`](../type-aliases/KernelEventMap.md)\[`K`\]

#### Returns

`void`
