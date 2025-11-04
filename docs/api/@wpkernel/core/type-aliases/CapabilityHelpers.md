[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / CapabilityHelpers

# Type Alias: CapabilityHelpers\&lt;K\&gt;

```ts
type CapabilityHelpers&lt;K&gt; = object;
```

Runtime helpers exposed by `defineCapability()`.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Properties

### can()

```ts
can: &lt;Key&gt;(key, ...params) =&gt; boolean | Promise&lt;boolean&gt;;
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
assert: &lt;Key&gt;(key, ...params) =&gt; void | Promise&lt;void&gt;;
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
keys: () =&gt; keyof K[];
```

#### Returns

keyof `K`[]

---

### extend()

```ts
extend: (additionalMap) =&gt; void;
```

#### Parameters

##### additionalMap

`Partial`\&lt;[`CapabilityMap`](CapabilityMap.md)\&lt;`K`\&gt;\&gt;

#### Returns

`void`

---

### cache

```ts
readonly cache: CapabilityCache;
```
