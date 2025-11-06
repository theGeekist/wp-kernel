[**@wpkernel/wp-json-ast v0.11.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / BuildTransientUnsupportedRouteOptions

# Interface: BuildTransientUnsupportedRouteOptions

## Extends

- [`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md)

## Properties

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

### pascalName

```ts
readonly pascalName: string;
```

#### Inherited from

[`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md).[`pascalName`](BuildTransientRouteBaseOptions.md#pascalname)

---

### metadataHost

```ts
readonly metadataHost: ResourceMetadataHost;
```

#### Inherited from

[`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md).[`metadataHost`](BuildTransientRouteBaseOptions.md#metadatahost)

---

### cacheSegments

```ts
readonly cacheSegments: readonly unknown[];
```

#### Inherited from

[`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md).[`cacheSegments`](BuildTransientRouteBaseOptions.md#cachesegments)

---

### usesIdentity

```ts
readonly usesIdentity: boolean;
```

#### Inherited from

[`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md).[`usesIdentity`](BuildTransientRouteBaseOptions.md#usesidentity)

---

### identity?

```ts
readonly optional identity: ResolvedIdentity;
```

#### Inherited from

[`BuildTransientRouteBaseOptions`](BuildTransientRouteBaseOptions.md).[`identity`](BuildTransientRouteBaseOptions.md#identity)
