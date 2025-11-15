[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ReporterMock

# Type Alias: ReporterMock

```ts
type ReporterMock = Reporter & object;
```

A mock implementation of the Reporter interface for testing purposes.

## Type Declaration

### child

```ts
child: jest.Mock<ReporterMock, [string]>;
```

### debug

```ts
debug: jest.Mock<void, [string, unknown?]>;
```

### error

```ts
error: jest.Mock<void, [string, unknown?]>;
```

### info

```ts
info: jest.Mock<void, [string, unknown?]>;
```

### warn

```ts
warn: jest.Mock<void, [string, unknown?]>;
```
