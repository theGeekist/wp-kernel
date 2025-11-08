[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ExecuteWpQueryOptions

# Interface: ExecuteWpQueryOptions

## Properties

### target

```ts
readonly target: string;
```

---

### argsVariable

```ts
readonly argsVariable: string;
```

---

### indentLevel?

```ts
readonly optional indentLevel: number;
```

---

### cache?

```ts
readonly optional cache: object;
```

#### host

```ts
readonly host: ResourceMetadataHost;
```

#### scope

```ts
readonly scope: "list" | "get" | "create" | "update" | "remove" | "custom";
```

#### operation

```ts
readonly operation: ResourceControllerCacheOperation;
```

#### segments

```ts
readonly segments: readonly unknown[];
```

#### description?

```ts
readonly optional description: string;
```
