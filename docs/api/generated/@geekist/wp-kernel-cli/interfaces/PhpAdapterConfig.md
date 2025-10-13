[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-cli](../README.md) / PhpAdapterConfig

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

[`PhpAstBuilder`](PhpAstBuilder.md)

##### context

[`AdapterContext`](AdapterContext.md) & `object`

#### Returns

`void`
