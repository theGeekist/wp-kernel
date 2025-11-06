[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / BuildWpTaxonomyGetRouteStatementsOptions

# Interface: BuildWpTaxonomyGetRouteStatementsOptions

## Properties

### pascalName

```ts
readonly pascalName: string;
```

---

### identity

```ts
readonly identity: ResolvedIdentity;
```

---

### errorCodeFactory()

```ts
readonly errorCodeFactory: (suffix) => string;
```

#### Parameters

##### suffix

`string`

#### Returns

`string`

---

### metadataHost

```ts
readonly metadataHost: ResourceMetadataHost;
```

---

### cacheSegments

```ts
readonly cacheSegments: readonly unknown[];
```

---

### storage

```ts
readonly storage: ResourceStorageConfig | undefined;
```

---

### resourceName?

```ts
readonly optional resourceName: string;
```

---

### requestVariable?

```ts
readonly optional requestVariable: string;
```

---

### identityVariable?

```ts
readonly optional identityVariable: string;
```
