[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / CapabilityHelpers

# Type Alias: CapabilityHelpers\&lt;K\&gt;

```ts
type CapabilityHelpers<K> = object;
```

Runtime helpers exposed by `defineCapability()`.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Properties

### assert()

```ts
assert: <Key>(key, ...params) => void | Promise<void>;
```

#### Type Parameters

##### Key

`Key` _extends_ keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)\&lt;`K`, `Key`\&gt;

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

---

### cache

```ts
readonly cache: CapabilityCache;
```

---

### can()

```ts
can: <Key>(key, ...params) => boolean | Promise<boolean>;
```

#### Type Parameters

##### Key

`Key` _extends_ keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](ParamsOf.md)\&lt;`K`, `Key`\&gt;

#### Returns

`boolean` \| `Promise`\&lt;`boolean`\&gt;

---

### extend()

```ts
extend: (additionalMap) => void;
```

#### Parameters

##### additionalMap

`Partial`\&lt;[`CapabilityMap`](CapabilityMap.md)\&lt;`K`\&gt;\&gt;

#### Returns

`void`

---

### keys()

```ts
keys: () => keyof K[];
```

#### Returns

keyof `K`[]
