[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceRequestEvent

# Type Alias: ResourceRequestEvent

```ts
type ResourceRequestEvent = object;
```

Event payload for wpk.resource.request

## Properties

### method

```ts
method: HttpMethod;
```

HTTP method

---

### path

```ts
path: string;
```

Request path

---

### query?

```ts
optional query: Record<string, unknown>;
```

Query parameters (if any)

---

### requestId

```ts
requestId: string;
```

Request ID for correlation

---

### timestamp

```ts
timestamp: number;
```

Timestamp when request started
