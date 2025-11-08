[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / RestControllerClassConfig

# Interface: RestControllerClassConfig

## Extended by

- [`RestControllerModuleControllerConfig`](RestControllerModuleControllerConfig.md)

## Properties

### className

```ts
readonly className: string;
```

---

### resourceName

```ts
readonly resourceName: string;
```

---

### schemaKey

```ts
readonly schemaKey: string;
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

### routes

```ts
readonly routes: readonly RestRouteConfig[];
```

---

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```

---

### capabilityClass?

```ts
readonly optional capabilityClass: string;
```
