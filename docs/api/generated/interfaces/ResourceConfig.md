[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / ResourceConfig

# Interface: ResourceConfig\<T, TQuery, \_TTypes\>

Defined in: [types.ts:125](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L125)

Complete resource definition configuration

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
	schema: import('./thing.schema.json'),
});
```

## Type Parameters

### T

`T` = `unknown`

The resource entity type (e.g., Thing)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { q?: string })

### \_TTypes

`_TTypes` = \[`T`, `TQuery`\]

## Properties

### name

```ts
name: string;
```

Defined in: [types.ts:137](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L137)

Unique resource name (lowercase, singular recommended)

Used for store keys, event names, and debugging

---

### routes

```ts
routes: ResourceRoutes;
```

Defined in: [types.ts:144](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L144)

REST route definitions

Define only the operations your resource supports

---

### cacheKeys?

```ts
optional cacheKeys: CacheKeys;
```

Defined in: [types.ts:151](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L151)

Cache key generators

Optional. If omitted, default cache keys based on resource name will be used

---

### schema?

```ts
optional schema: unknown;
```

Defined in: [types.ts:163](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L163)

JSON Schema for runtime validation

Optional. Provides runtime type safety and validation errors

#### Example

```ts
schema: import('../../contracts/thing.schema.json');
```
