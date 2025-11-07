[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / ResourceStorageAccessors

# Interface: ResourceStorageAccessors\<TStorageKind\>

## Extends

- `ResourceAccessorBuckets`

## Type Parameters

### TStorageKind

`TStorageKind` _extends_ `string` = `string`

## Properties

### kind

```ts
readonly kind: TStorageKind;
```

---

### label

```ts
readonly label: string;
```

---

### requests

```ts
readonly requests: readonly ResourceAccessorDescriptor<unknown>[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.requests;
```

---

### queries

```ts
readonly queries: readonly ResourceAccessorDescriptor<unknown>[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.queries;
```

---

### mutations

```ts
readonly mutations: readonly ResourceAccessorDescriptor<unknown>[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.mutations;
```

---

### caches

```ts
readonly caches: readonly ResourceAccessorDescriptor<unknown>[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.caches;
```

---

### helpers

```ts
readonly helpers: readonly ResourceAccessorDescriptor<unknown>[];
```

#### Inherited from

```ts
ResourceAccessorBuckets.helpers;
```
