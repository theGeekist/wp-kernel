[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / ResourceResponseEvent

# Interface: ResourceResponseEvent\<T\>

Defined in: [http/types.ts:107](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L107)

Event payload for wpk.resource.response

## Type Parameters

### T

`T` = `unknown`

## Properties

### requestId

```ts
requestId: string;
```

Defined in: [http/types.ts:111](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L111)

Request ID for correlation

---

### method

```ts
method: HttpMethod;
```

Defined in: [http/types.ts:116](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L116)

HTTP method

---

### path

```ts
path: string;
```

Defined in: [http/types.ts:121](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L121)

Request path

---

### status

```ts
status: number;
```

Defined in: [http/types.ts:126](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L126)

Response status code

---

### data

```ts
data: T;
```

Defined in: [http/types.ts:131](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L131)

Response data

---

### duration

```ts
duration: number;
```

Defined in: [http/types.ts:136](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L136)

Duration in milliseconds

---

### timestamp

```ts
timestamp: number;
```

Defined in: [http/types.ts:141](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L141)

Timestamp when response received
