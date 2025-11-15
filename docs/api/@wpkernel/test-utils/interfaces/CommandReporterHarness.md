[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / CommandReporterHarness

# Interface: CommandReporterHarness

Represents a harness for constructing and tracking reporter mocks that share
a common child factory.

## Properties

### at()

```ts
readonly at: (index) => ReporterMock | undefined;
```

Retrieves a reporter by creation order.

#### Parameters

##### index

`number`

#### Returns

[`ReporterMock`](../type-aliases/ReporterMock.md) \| `undefined`

---

### create()

```ts
readonly create: () => ReporterMock;
```

Creates a new reporter mock that participates in the shared child
tracking.

#### Returns

[`ReporterMock`](../type-aliases/ReporterMock.md)

---

### factory

```ts
readonly factory: Mock;
```

Jest mock that returns a new reporter for each invocation.

---

### getChild()

```ts
readonly getChild: (namespace) => ReporterMock | undefined;
```

Looks up a child reporter by namespace if it has been created.

#### Parameters

##### namespace

`string`

#### Returns

[`ReporterMock`](../type-aliases/ReporterMock.md) \| `undefined`

---

### reporters

```ts
readonly reporters: readonly ReporterMock[];
```

Ordered collection of every reporter created by the harness.

---

### reset()

```ts
readonly reset: () => void;
```

Clears all recorded reporters while keeping the factory instance.

#### Returns

`void`

---

### useChild()

```ts
readonly useChild: (namespace) => ReporterMock;
```

Returns the reporter associated with the provided namespace, creating
it when it does not yet exist.

#### Parameters

##### namespace

`string`

#### Returns

[`ReporterMock`](../type-aliases/ReporterMock.md)
