[**WP Kernel API v0.8.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [policy](../README.md) / UsePolicyResult

# Type Alias: UsePolicyResult\&lt;K\&gt;

```ts
type UsePolicyResult<K> = object;
```

Result returned by the `usePolicy()` hook.

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
