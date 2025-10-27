[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / ResourceControllerRouteMetadata

# Interface: ResourceControllerRouteMetadata

## Properties

### method

```ts
readonly method: string;
```

---

### path

```ts
readonly path: string;
```

---

### kind

```ts
readonly kind: "list" | "get" | "create" | "update" | "remove" | "custom";
```

---

### cacheSegments?

```ts
readonly optional cacheSegments: readonly unknown[];
```

---

### tags?

```ts
readonly optional tags: Readonly<Record<string, string>>;
```
