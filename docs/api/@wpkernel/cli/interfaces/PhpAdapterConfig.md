[**@wpkernel/cli v0.12.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PhpAdapterConfig

# Interface: PhpAdapterConfig

Configuration returned by the PHP adapter factory.

## Properties

### namespace?

```ts
optional namespace: string;
```

---

### autoload?

```ts
optional autoload: string;
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
