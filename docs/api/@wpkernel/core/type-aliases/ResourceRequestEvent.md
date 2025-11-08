[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceRequestEvent

# Type Alias: ResourceRequestEvent

```ts
type ResourceRequestEvent = object;
```

Event payload for wpk.resource.request

## Properties

### requestId

```ts
requestId: string;
```

Request ID for correlation

---

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

### timestamp

```ts
timestamp: number;
```

Timestamp when request started

---

### query?

```ts
optional query: Record<string, unknown>;
```

Query parameters (if any)
