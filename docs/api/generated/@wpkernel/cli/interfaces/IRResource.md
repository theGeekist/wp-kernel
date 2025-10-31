[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / IRResource

# Interface: IRResource

## Properties

### cacheKeys

```ts
cacheKeys: object;
```

#### create?

```ts
optional create: IRResourceCacheKey;
```

#### get

```ts
get: IRResourceCacheKey;
```

#### list

```ts
list: IRResourceCacheKey;
```

#### remove?

```ts
optional remove: IRResourceCacheKey;
```

#### update?

```ts
optional update: IRResourceCacheKey;
```

---

### hash

```ts
hash: string;
```

---

### identity?

```ts
optional identity: ResourceIdentityConfig;
```

---

### name

```ts
name: string;
```

---

### queryParams?

```ts
optional queryParams: ResourceQueryParams;
```

---

### routes

```ts
routes: IRRoute[];
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

### storage?

```ts
optional storage: ResourceStorageConfig;
```

---

### ui?

```ts
optional ui: ResourceUIConfig<unknown, unknown>;
```

---

### warnings

```ts
warnings: IRWarning[];
```
