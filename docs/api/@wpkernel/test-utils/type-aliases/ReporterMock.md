[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ReporterMock

# Type Alias: ReporterMock

```ts
type ReporterMock = Reporter & object;
```

A mock implementation of the Reporter interface for testing purposes.

## Type Declaration

### info

```ts
info: jest.Mock<void, [string, unknown?]>;
```

### debug

```ts
debug: jest.Mock<void, [string, unknown?]>;
```

### warn

```ts
warn: jest.Mock<void, [string, unknown?]>;
```

### error

```ts
error: jest.Mock<void, [string, unknown?]>;
```

### child

```ts
child: jest.Mock & lt;
(ReporterMock, [string] & gt);
```
