[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / ResourceControllerMetadata

# Interface: ResourceControllerMetadata

## Properties

### kind

```ts
readonly kind: "resource-controller";
```

---

### name

```ts
readonly name: string;
```

---

### identity

```ts
readonly identity: object;
```

#### type

```ts
readonly type: "string" | "number";
```

#### param

```ts
readonly param: string;
```

---

### routes

```ts
readonly routes: readonly ResourceControllerRouteMetadata[];
```

---

### cache?

```ts
readonly optional cache: ResourceControllerCacheMetadata;
```
