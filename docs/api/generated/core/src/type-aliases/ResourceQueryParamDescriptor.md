[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceQueryParamDescriptor

# Type Alias: ResourceQueryParamDescriptor

```ts
type ResourceQueryParamDescriptor = object;
```

Descriptor for query parameters exposed by a resource.

Used by tooling to generate REST argument metadata.

## Properties

### description?

```ts
optional description: string;
```

---

### enum?

```ts
optional enum: readonly string[];
```

---

### optional?

```ts
optional optional: boolean;
```

---

### type

```ts
type: 'string' | 'enum';
```
