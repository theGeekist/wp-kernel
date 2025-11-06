[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / DefinedInteraction

# Interface: DefinedInteraction\<TStoreResult\>

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
