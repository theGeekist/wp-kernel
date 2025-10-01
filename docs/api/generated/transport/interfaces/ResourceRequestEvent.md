[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [transport](../README.md) / ResourceRequestEvent

# Interface: ResourceRequestEvent

Defined in: [transport/types.ts:77](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L77)

Event payload for wpk.resource.request

## Properties

### requestId

```ts
requestId: string;
```

Defined in: [transport/types.ts:81](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L81)

Request ID for correlation

---

### method

```ts
method: HttpMethod;
```

Defined in: [transport/types.ts:86](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L86)

HTTP method

---

### path

```ts
path: string;
```

Defined in: [transport/types.ts:91](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L91)

Request path

---

### query?

```ts
optional query: Record<string, unknown>;
```

Defined in: [transport/types.ts:96](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L96)

Query parameters (if any)

---

### timestamp

```ts
timestamp: number;
```

Defined in: [transport/types.ts:101](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L101)

Timestamp when request started
