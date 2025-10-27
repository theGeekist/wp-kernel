[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / ResourceControllerCacheEvent

# Interface: ResourceControllerCacheEvent

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
readonly segments: readonly string[];
```

---

### description?

```ts
readonly optional description: string;
```
