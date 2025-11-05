[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WPKConfigV1Like

# Interface: WPKConfigV1Like\&lt;TSchemas, TResources, TAdapters\&gt;

## Type Parameters

### TSchemas

`TSchemas` _extends_ `SchemaRegistryLike` = `SchemaRegistryLike`

### TResources

`TResources` _extends_ `ResourceRegistryLike` = `ResourceRegistryLike`

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
