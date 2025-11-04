[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / WPKConfigV1Like

# Interface: WPKConfigV1Like\&lt;TSchemas, TResources, TAdapters\&gt;

## Type Parameters

### TSchemas

`TSchemas` _extends_ `Record`\&lt;`string`, `unknown`\&gt; = `Record`\&lt;`string`, `unknown`\&gt;

### TResources

`TResources` _extends_ `Record`\&lt;`string`, `unknown`\&gt; = `Record`\&lt;`string`, `unknown`\&gt;

### TAdapters

`TAdapters` = `unknown`

## Properties

### version

```ts
readonly version: number;
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
