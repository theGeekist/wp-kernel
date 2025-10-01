[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [transport](../README.md) / TransportResponse

# Interface: TransportResponse\<T\>

Defined in: [transport/types.ts:52](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L52)

Response from transport.fetch()

## Type Parameters

### T

`T` = `unknown`

## Properties

### data

```ts
data: T;
```

Defined in: [transport/types.ts:56](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L56)

Response data

---

### status

```ts
status: number;
```

Defined in: [transport/types.ts:61](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L61)

HTTP status code

---

### headers

```ts
headers: Record<string, string>;
```

Defined in: [transport/types.ts:66](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L66)

Response headers

---

### requestId

```ts
requestId: string;
```

Defined in: [transport/types.ts:71](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/transport/types.ts#L71)

Request ID used for this request (for correlation)
