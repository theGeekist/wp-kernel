[**WP Kernel API v0.4.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceConfig

# Type Alias: ResourceConfig\<T, TQuery, \_TTypes\>

```ts
type ResourceConfig<T, TQuery, _TTypes> = object;
```

## Type Parameters

### T

`T` = `unknown`

### TQuery

`TQuery` = `unknown`

### \_TTypes

`_TTypes` = \[`T`, `TQuery`\]

## Properties

### name

```ts
name: string;
```

Unique resource name (lowercase, singular recommended)

Used for store keys, event names, and debugging

---

### routes

```ts
routes: ResourceRoutes;
```

REST route definitions

Define only the operations your resource supports

---

### cacheKeys?

```ts
optional cacheKeys: CacheKeys;
```

Cache key generators

Optional. If omitted, default cache keys based on resource name will be used

---

### namespace?

```ts
optional namespace: string;
```

Namespace for events and store keys

Optional. If omitted, namespace will be auto-detected from plugin context.
For explicit control, provide a namespace string.

#### Example

```ts
namespace: 'my-plugin'; // Explicit namespace
// OR
name: 'my-plugin:job'; // Shorthand namespace:name format
```

---

### schema?

```ts
optional schema: Promise<unknown> | unknown;
```

JSON Schema for runtime validation

Optional. Provides runtime type safety and validation errors

#### Example

```ts
schema: import('../../contracts/thing.schema.json');
```

---

### reporter?

```ts
optional reporter: Reporter;
```

Optional reporter override for resource instrumentation.

When provided, the resource will emit debug/info/error logs through this
reporter instead of creating a child reporter from the kernel instance.

---

### store?

```ts
optional store: ResourceStoreOptions<T, TQuery>;
```

Optional store configuration overrides.

Use this to customize identifier extraction, query key generation, or
provide seeded state when registering the resource store.
