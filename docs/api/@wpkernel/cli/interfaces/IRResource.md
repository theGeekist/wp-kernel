[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / IRResource

# Interface: IRResource

Represents an Intermediate Representation (IR) for a resource.

## Properties

### id

```ts
id: string;
```

Stable identifier for the resource entry.

---

### name

```ts
name: string;
```

The name of the resource.

---

### schemaKey

```ts
schemaKey: string;
```

The key of the schema associated with this resource.

---

### schemaProvenance

```ts
schemaProvenance: SchemaProvenance;
```

The provenance of the schema.

---

### routes

```ts
routes: IRRoute[];
```

An array of routes defined for this resource.

---

### cacheKeys

```ts
cacheKeys: object;
```

Cache key definitions for various resource operations.

#### list

```ts
list: IRResourceCacheKey;
```

#### get

```ts
get: IRResourceCacheKey;
```

#### create?

```ts
optional create: IRResourceCacheKey;
```

#### update?

```ts
optional update: IRResourceCacheKey;
```

#### remove?

```ts
optional remove: IRResourceCacheKey;
```

---

### hash

```ts
hash: IRHashProvenance;
```

A hash of the resource definition for change detection.

---

### warnings

```ts
warnings: IRWarning[];
```

An array of warnings associated with this resource.

---

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

Optional: Identity configuration for the resource.

---

### storage?

```ts
optional storage: ResourceStorageConfig;
```

Optional: Storage configuration for the resource.

---

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

Optional: Query parameters configuration for the resource.

---

### ui?

```ts
optional ui: ResourceUIConfig<unknown, unknown>;
```

Optional: UI configuration for the resource.

---

### capabilities?

```ts
optional capabilities: ResourceCapabilityMap;
```

Optional: Inline capability mappings for the resource.
