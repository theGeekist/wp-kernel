[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ResourceConfig

# Type Alias: ResourceConfig\&lt;T, TQuery, \_TTypes\&gt;

```ts
type ResourceConfig&lt;T, TQuery, _TTypes&gt; = object;
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

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

Optional identifier hints used by tooling.

The runtime ignores this field; CLI tooling can derive store defaults and route helpers.

---

### storage?

```ts
optional storage: ResourceStorageConfig;
```

Optional persistence strategy metadata.

The runtime ignores this field; CLI tooling can emit registration scaffolding.

---

### store?

```ts
optional store: ResourceStoreOptions&lt;T, TQuery&gt;;
```

Optional overrides for store configuration.

Provided for forward compatibility with CLI-generated descriptors.

---

### cacheKeys?

```ts
optional cacheKeys: CacheKeys&lt;TQuery&gt;;
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
optional schema: Promise&lt;unknown&gt; | unknown | string;
```

JSON Schema for runtime validation

Optional. Provides runtime type safety and validation errors

#### Example

```ts
schema: import('../../contracts/thing.schema.json');
```

---

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

Optional query parameter descriptors for tooling.

---

### reporter?

```ts
optional reporter: Reporter;
```

Optional reporter override for resource instrumentation.

When provided, the resource will emit debug/info/error logs through this
reporter instead of creating a child reporter from the WP Kernel instance.

---

### ui?

```ts
optional ui: ResourceUIConfig&lt;T, TQuery&gt;;
```

Optional UI metadata surfaced to runtime integrations (e.g., DataViews).
