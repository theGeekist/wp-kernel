[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / ReporterMock

# Type Alias: ReporterMock

```ts
type ReporterMock = Reporter & object;
```

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
child: jest.Mock<ReporterMock, [string]>;
```
