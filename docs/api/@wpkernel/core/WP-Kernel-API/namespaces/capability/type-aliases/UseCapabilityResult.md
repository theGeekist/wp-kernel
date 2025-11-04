[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [capability](../README.md) / UseCapabilityResult

# Type Alias: UseCapabilityResult\&lt;K\&gt;

```ts
type UseCapabilityResult&lt;K&gt; = object;
```

Result returned by the `useCapability()` hook.

## Type Parameters

### K

`K` *extends* `Record`\&lt;`string`, `unknown`\&gt;

## Properties

### can()

```ts
can: &lt;Key&gt;(key, ...params) =&gt; boolean;
```

#### Type Parameters

##### Key

`Key` *extends* keyof `K`

#### Parameters

##### key

`Key`

##### params

...[`ParamsOf`](../../../../type-aliases/ParamsOf.md)\&lt;`K`, `Key`\&gt;

#### Returns

`boolean`

***

### keys

```ts
keys: keyof K[];
```

***

### isLoading

```ts
isLoading: boolean;
```

***

### error?

```ts
optional error: Error;
```
