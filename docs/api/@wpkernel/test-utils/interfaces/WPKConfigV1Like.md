[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WPKConfigV1Like

# Interface: WPKConfigV1Like\<TSchemas, TResources, TAdapters\>

## Type Parameters

### TSchemas

`TSchemas` _extends_ [`SchemaRegistryLike`](SchemaRegistryLike.md) = [`SchemaRegistryLike`](SchemaRegistryLike.md)

### TResources

`TResources` _extends_ [`ResourceRegistryLike`](ResourceRegistryLike.md) = [`ResourceRegistryLike`](ResourceRegistryLike.md)

### TAdapters

`TAdapters` = `unknown`

## Properties

### namespace

```ts
readonly namespace: string;
```

---

### resources

```ts
readonly resources: TResources;
```

---

### schemas

```ts
readonly schemas: TSchemas;
```

---

### version

```ts
readonly version: 1;
```

---

### adapters?

```ts
readonly optional adapters: TAdapters;
```
