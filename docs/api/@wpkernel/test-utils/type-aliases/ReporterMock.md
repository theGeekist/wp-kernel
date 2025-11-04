[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ReporterMock

# Type Alias: ReporterMock

```ts
type ReporterMock = Reporter & object;
```

A mock implementation of the Reporter interface for testing purposes.

## Type Declaration

### info

```ts
info: jest.Mock&lt;void, [string, unknown?]&gt;;
```

### debug

```ts
debug: jest.Mock&lt;void, [string, unknown?]&gt;;
```

### warn

```ts
warn: jest.Mock&lt;void, [string, unknown?]&gt;;
```

### error

```ts
error: jest.Mock&lt;void, [string, unknown?]&gt;;
```

### child

```ts
child: jest.Mock & lt;
(ReporterMock, [string] & gt);
```
