[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PhpAdapterConfig

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
optional customise: (builder, context) =&gt; void;
```

#### Parameters

##### builder

`PhpAstBuilder`

##### context

[`AdapterContext`](AdapterContext.md) & `object`

#### Returns

`void`
