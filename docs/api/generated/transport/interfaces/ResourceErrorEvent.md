[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [transport](../README.md) / ResourceErrorEvent

# Interface: ResourceErrorEvent

Defined in: [transport/types.ts:147](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L147)

Event payload for wpk.resource.error

## Properties

### requestId

```ts
requestId: string;
```

Defined in: [transport/types.ts:151](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L151)

Request ID for correlation

---

### method

```ts
method: HttpMethod;
```

Defined in: [transport/types.ts:156](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L156)

HTTP method

---

### path

```ts
path: string;
```

Defined in: [transport/types.ts:161](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L161)

Request path

---

### code

```ts
code: string;
```

Defined in: [transport/types.ts:166](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L166)

Error code

---

### message

```ts
message: string;
```

Defined in: [transport/types.ts:171](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L171)

Error message

---

### status?

```ts
optional status: number;
```

Defined in: [transport/types.ts:176](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L176)

HTTP status code (if available)

---

### duration

```ts
duration: number;
```

Defined in: [transport/types.ts:181](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L181)

Duration in milliseconds

---

### timestamp

```ts
timestamp: number;
```

Defined in: [transport/types.ts:186](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L186)

Timestamp when error occurred
