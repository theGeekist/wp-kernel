[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / TransportRequest

# Interface: TransportRequest

Defined in: [http/types.ts:16](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L16)

Request options for transport.fetch()

## Properties

### path

```ts
path: string;
```

Defined in: [http/types.ts:20](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L20)

REST API path (e.g., '/wpk/v1/things' or '/wpk/v1/things/123')

---

### method

```ts
method: HttpMethod;
```

Defined in: [http/types.ts:25](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L25)

HTTP method

---

### data?

```ts
optional data: unknown;
```

Defined in: [http/types.ts:30](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L30)

Request body (for POST/PUT/PATCH)

---

### query?

```ts
optional query: Record<string, unknown>;
```

Defined in: [http/types.ts:35](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L35)

Query parameters (automatically appended to path)

---

### fields?

```ts
optional fields: string[];
```

Defined in: [http/types.ts:41](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L41)

Fields to request (\_fields query parameter)
If provided, will be added as ?\_fields=field1,field2

---

### requestId?

```ts
optional requestId: string;
```

Defined in: [http/types.ts:46](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/types.ts#L46)

Custom request ID for correlation (generated if not provided)
