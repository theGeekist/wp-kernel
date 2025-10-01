[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [transport](../README.md) / ResourceResponseEvent

# Interface: ResourceResponseEvent\<T\>

Defined in: [transport/types.ts:107](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L107)

Event payload for wpk.resource.response

## Type Parameters

### T

`T` = `unknown`

## Properties

### requestId

```ts
requestId: string;
```

Defined in: [transport/types.ts:111](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L111)

Request ID for correlation

---

### method

```ts
method: HttpMethod;
```

Defined in: [transport/types.ts:116](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L116)

HTTP method

---

### path

```ts
path: string;
```

Defined in: [transport/types.ts:121](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L121)

Request path

---

### status

```ts
status: number;
```

Defined in: [transport/types.ts:126](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L126)

Response status code

---

### data

```ts
data: T;
```

Defined in: [transport/types.ts:131](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L131)

Response data

---

### duration

```ts
duration: number;
```

Defined in: [transport/types.ts:136](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L136)

Duration in milliseconds

---

### timestamp

```ts
timestamp: number;
```

Defined in: [transport/types.ts:141](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L141)

Timestamp when response received
