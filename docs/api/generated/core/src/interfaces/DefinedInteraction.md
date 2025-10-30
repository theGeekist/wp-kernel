[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / DefinedInteraction

# Interface: DefinedInteraction\&lt;TStoreResult\&gt;

Result returned by `defineInteraction`.

## Type Parameters

### TStoreResult

`TStoreResult`

## Properties

### namespace

```ts
readonly namespace: string;
```

---

### store

```ts
readonly store: TStoreResult;
```

---

### syncServerState()

```ts
readonly syncServerState: () => void;
```

#### Returns

`void`

---

### getServerState()

```ts
readonly getServerState: () => object;
```

#### Returns

`object`
