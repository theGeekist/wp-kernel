[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

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

### namespace?

```ts
optional namespace: string;
```
