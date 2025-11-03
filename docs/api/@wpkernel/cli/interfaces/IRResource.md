[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / IRResource

# Interface: IRResource

## Properties

### name

```ts
name: string;
```

---

### schemaKey

```ts
schemaKey: string;
```

---

### schemaProvenance

```ts
schemaProvenance: SchemaProvenance;
```

---

### routes

```ts
routes: IRRoute[];
```

---

### cacheKeys

```ts
cacheKeys: object;
```

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

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

---

### storage?

```ts
optional storage: ResourceStorageConfig;
```

---

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

---

### ui?

```ts
optional ui: ResourceUIConfig<unknown, unknown>;
```

---

### hash

```ts
hash: string;
```

---

### warnings

```ts
warnings: IRWarning[];
```
