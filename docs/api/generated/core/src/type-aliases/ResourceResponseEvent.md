[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceResponseEvent

# Type Alias: ResourceResponseEvent\&lt;T\&gt;

```ts
type ResourceResponseEvent<T> = object;
```

Event payload for wpk.resource.response

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

### duration

```ts
duration: number;
```

Duration in milliseconds

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

### requestId

```ts
requestId: string;
```

Request ID for correlation

---

### status

```ts
status: number;
```

Response status code

---

### timestamp

```ts
timestamp: number;
```

Timestamp when response received
