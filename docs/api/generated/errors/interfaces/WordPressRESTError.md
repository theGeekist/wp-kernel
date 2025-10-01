[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [errors](../README.md) / WordPressRESTError

# Interface: WordPressRESTError

Defined in: [errors/ServerError.ts:20](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/ServerError.ts#L20)

WordPress REST API error response shape

This interface represents the standard error format returned by WordPress REST API.

## Properties

### code

```ts
code: string;
```

Defined in: [errors/ServerError.ts:22](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/ServerError.ts#L22)

Error code from WordPress (e.g., 'rest_forbidden', 'invalid_param')

---

### message

```ts
message: string;
```

Defined in: [errors/ServerError.ts:24](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/ServerError.ts#L24)

Human-readable error message

---

### data?

```ts
optional data: object;
```

Defined in: [errors/ServerError.ts:26](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/errors/ServerError.ts#L26)

Additional error data

#### Index Signature

```ts
[key: string]: unknown
```

#### status?

```ts
optional status: number;
```

HTTP status code

#### params?

```ts
optional params: Record<string, string>;
```

Invalid parameters that caused the error

#### details?

```ts
optional details: Record<string, unknown>;
```

Detailed validation or error information
