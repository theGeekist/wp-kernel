[**@wpkernel/cli v0.12.3-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PhpAdapterConfig

# Interface: PhpAdapterConfig

Configuration returned by the PHP adapter factory.

## Properties

### autoload?

```ts
optional autoload: string;
```

---

### codemods?

```ts
optional codemods: PhpCodemodAdapterConfig;
```

---

### customise()?

```ts
optional customise: (builder, context) => void;
```

#### Parameters

##### builder

`PhpAstBuilder`

##### context

[`AdapterContext`](AdapterContext.md) & `object`

#### Returns

`void`

---

### driver?

```ts
optional driver: PhpDriverConfigurationOptions;
```

---

### namespace?

```ts
optional namespace: string;
```
