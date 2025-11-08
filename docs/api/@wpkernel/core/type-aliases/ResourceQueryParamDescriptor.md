[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceQueryParamDescriptor

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
