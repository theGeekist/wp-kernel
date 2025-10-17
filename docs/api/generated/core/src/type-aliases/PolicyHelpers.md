[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / PolicyHelpers

# Type Alias: PolicyHelpers\&lt;K\&gt;

```ts
type PolicyHelpers<K> = object;
```

Runtime helpers exposed by `definePolicy()`.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Properties

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

### keys()

```ts
keys: () => keyof K[];
```

#### Returns

keyof `K`[]

---

### extend()

```ts
extend: (additionalMap) => void;
```

#### Parameters

##### additionalMap

`Partial`\&lt;[`PolicyMap`](PolicyMap.md)\&lt;`K`\&gt;\&gt;

#### Returns

`void`

---

### cache

```ts
readonly cache: PolicyCache;
```
