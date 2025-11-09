[**@wpkernel/core v0.12.1-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceQueryParams

# Type Alias: ResourceQueryParams

```ts
type ResourceQueryParams = Record<string, ResourceQueryParamDescriptor>;
```

Declarative map of supported query parameters for the resource.

Tooling uses this to derive REST argument schemas, filters, and documentation.
The runtime treats this as metadata and does not enforce it directly.
