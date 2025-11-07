[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / BuildResourceControllerRouteSetOptions

# Interface: BuildResourceControllerRouteSetOptions

## Properties

### plan

```ts
readonly plan: Pick<RestControllerRoutePlan, "definition" | "methodName" | "docblockSummary">;
```

---

### storageMode?

```ts
readonly optional storageMode: RestControllerRouteStorageMode;
```

---

### handlers?

```ts
readonly optional handlers: RestControllerRouteHandlers;
```

---

### transientHandlers?

```ts
readonly optional transientHandlers: RestControllerRouteTransientHandlers;
```

---

### optionHandlers?

```ts
readonly optional optionHandlers: RestControllerRouteOptionHandlers;
```

---

### buildFallbackStatements?

```ts
readonly optional buildFallbackStatements: BuildRouteFallbackStatements;
```

---

### fallbackContext?

```ts
readonly optional fallbackContext: RestControllerRouteFallbackContext;
```
