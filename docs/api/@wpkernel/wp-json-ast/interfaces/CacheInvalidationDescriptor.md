[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / CacheInvalidationDescriptor

# Interface: CacheInvalidationDescriptor

## Properties

### scope

```ts
readonly scope: "list" | "get" | "create" | "update" | "remove" | "custom";
```

---

### operation

```ts
readonly operation: ResourceControllerCacheOperation;
```

---

### segments

```ts
readonly segments: readonly unknown[];
```

---

### description?

```ts
readonly optional description: string;
```
