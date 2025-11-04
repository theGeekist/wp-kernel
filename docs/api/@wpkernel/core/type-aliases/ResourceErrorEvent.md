[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceErrorEvent

# Type Alias: ResourceErrorEvent

```ts
type ResourceErrorEvent = object;
```

Event payload for wpk.resource.error

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

### code

```ts
code: string;
```

Error code

---

### message

```ts
message: string;
```

Error message

---

### duration

```ts
duration: number;
```

Duration in milliseconds

---

### timestamp

```ts
timestamp: number;
```

Timestamp when error occurred

---

### status?

```ts
optional status: number;
```

HTTP status code (if available)
