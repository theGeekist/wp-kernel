[**@wpkernel/test-utils v0.12.1-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ReporterMockOptions

# Interface: ReporterMockOptions

Options for creating a `ReporterMock`.

## Properties

### childFactory()?

```ts
optional childFactory: (namespace) => ReporterMock;
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
optional overrides: Partial<Reporter>;
```

Partial overrides for the reporter methods.
