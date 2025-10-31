[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [capability](../README.md) / UseCapabilityResult

# Type Alias: UseCapabilityResult\&lt;K\&gt;

```ts
type UseCapabilityResult<K> = object;
```

Result returned by the `useCapability()` hook.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Properties

### can()

```ts
can: <Key>(key, ...params) => boolean;
```

#### Type Parameters

##### Key

`Key` _extends_ keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](../../../type-aliases/ParamsOf.md)\&lt;`K`, `Key`\&gt;

#### Returns

`boolean`

---

### keys

```ts
keys: keyof K[];
```

---

### isLoading

```ts
isLoading: boolean;
```

---

### error?

```ts
optional error: Error;
```
