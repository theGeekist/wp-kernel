[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / RestControllerResourcePlan

# Interface: RestControllerResourcePlan

## Properties

### name

```ts
readonly name: string;
```

---

### className

```ts
readonly className: string;
```

---

### schemaKey

```ts
readonly schemaKey: string;
```

---

### schemaProvenance

```ts
readonly schemaProvenance: string;
```

---

### restArgsExpression

```ts
readonly restArgsExpression: PhpExpr;
```

---

### identity

```ts
readonly identity: RestControllerIdentity;
```

---

### cacheKeys

```ts
readonly cacheKeys: ResourceCacheKeysPlan;
```

---

### routes

```ts
readonly routes: readonly RestControllerRoutePlan[];
```

---

### mutationMetadata?

```ts
readonly optional mutationMetadata: RouteMutationMetadataPlan;
```

---

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```

---

### helperSignatures?

```ts
readonly optional helperSignatures: readonly string[];
```
