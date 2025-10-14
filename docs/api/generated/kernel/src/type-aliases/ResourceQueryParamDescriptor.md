[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / ResourceQueryParamDescriptor

# Type Alias: ResourceQueryParamDescriptor

```ts
type ResourceQueryParamDescriptor = object;
```

Descriptor for query parameters exposed by a resource.

Used by tooling to generate REST argument metadata.

## Properties

### type

```ts
type: 'string' | 'enum';
```

---

### optional?

```ts
optional optional: boolean;
```

---

### enum?

```ts
optional enum: readonly string[];
```

---

### description?

```ts
optional description: string;
```
