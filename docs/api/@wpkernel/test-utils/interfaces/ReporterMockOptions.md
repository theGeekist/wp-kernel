[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ReporterMockOptions

# Interface: ReporterMockOptions

Options for creating a `ReporterMock`.

## Properties

### childFactory()?

```ts
optional childFactory: (namespace) =&gt; ReporterMock;
```

A factory function to create child reporter mocks.

#### Parameters

##### namespace

`string`

#### Returns

[`ReporterMock`](../type-aliases/ReporterMock.md)

---

### overrides?

```ts
optional overrides: Partial&lt;Reporter&gt;;
```

Partial overrides for the reporter methods.
