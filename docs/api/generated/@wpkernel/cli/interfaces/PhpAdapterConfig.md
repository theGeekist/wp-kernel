[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / PhpAdapterConfig

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

[`PhpAstBuilder`](../../../php-json-ast/src/interfaces/PhpAstBuilder.md)

##### context

[`AdapterContext`](AdapterContext.md) & `object`

#### Returns

`void`

---

### namespace?

```ts
optional namespace: string;
```
