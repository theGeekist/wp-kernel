[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / RestControllerModuleControllerConfig

# Interface: RestControllerModuleControllerConfig

## Extends

- [`RestControllerClassConfig`](RestControllerClassConfig.md)

## Properties

### resourceName

```ts
readonly resourceName: string;
```

#### Overrides

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`resourceName`](RestControllerClassConfig.md#resourcename)

---

### schemaProvenance

```ts
readonly schemaProvenance: string;
```

---

### fileName

```ts
readonly fileName: string;
```

---

### className

```ts
readonly className: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`className`](RestControllerClassConfig.md#classname)

---

### schemaKey

```ts
readonly schemaKey: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`schemaKey`](RestControllerClassConfig.md#schemakey)

---

### restArgsExpression

```ts
readonly restArgsExpression: PhpExpr;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`restArgsExpression`](RestControllerClassConfig.md#restargsexpression)

---

### identity

```ts
readonly identity: RestControllerIdentity;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`identity`](RestControllerClassConfig.md#identity)

---

### routes

```ts
readonly routes: readonly RestRouteConfig[];
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`routes`](RestControllerClassConfig.md#routes)

---

### metadata?

```ts
readonly optional metadata: ResourceControllerMetadata;
```

---

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`helperMethods`](RestControllerClassConfig.md#helpermethods)

---

### capabilityClass?

```ts
readonly optional capabilityClass: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`capabilityClass`](RestControllerClassConfig.md#capabilityclass)
