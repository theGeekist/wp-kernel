[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / TransportResponse

# Type Alias: TransportResponse\&lt;T\&gt;

```ts
type TransportResponse<T> = object;
```

Response from transport.fetch()

## Type Parameters

### T

`T` = `unknown`

## Properties

### data

```ts
data: T;
```

Response data

---

### headers

```ts
headers: Record<string, string>;
```

Response headers

---

### requestId

```ts
requestId: string;
```

Request ID used for this request (for correlation)

---

### status

```ts
status: number;
```

HTTP status code
