[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceCapabilityMap

# Type Alias: ResourceCapabilityMap

```ts
type ResourceCapabilityMap = Record<
	string,
	string | ResourceCapabilityDescriptor
>;
```

Capability map for a resource.

Maps capability keys to WordPress capabilities. Values can be:

- String: Simple WordPress capability (e.g., 'edit_posts')
- Object: Detailed descriptor with appliesTo and optional binding
