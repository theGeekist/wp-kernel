[**@wpkernel/test-utils v0.11.0**](../README.md)

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

### version

```ts
readonly version: 1;
```

---

### namespace

```ts
readonly namespace: string;
```

---

### schemas

```ts
readonly schemas: TSchemas;
```

---

### resources

```ts
readonly resources: TResources;
```

---

### adapters?

```ts
readonly optional adapters: TAdapters;
```
