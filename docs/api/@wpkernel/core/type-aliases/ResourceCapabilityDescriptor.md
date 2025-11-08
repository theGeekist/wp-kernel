[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceCapabilityDescriptor

# Type Alias: ResourceCapabilityDescriptor

```ts
type ResourceCapabilityDescriptor = object;
```

Capability descriptor for object-level or resource-level checks.

## Properties

### capability

```ts
capability: string;
```

WordPress capability to check (e.g., 'edit_posts')

---

### appliesTo

```ts
appliesTo: 'resource' | 'object';
```

Whether this applies to the resource collection or individual objects

---

### binding?

```ts
optional binding: string;
```

Optional parameter binding for object-level checks (e.g., 'id', 'postId')
