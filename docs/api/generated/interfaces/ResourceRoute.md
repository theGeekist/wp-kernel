[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / ResourceRoute

# Interface: ResourceRoute

Defined in: [types.ts:24](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L24)

Route definition for a single REST operation

## Example

```ts
{ path: '/wpk/v1/things/:id', method: 'GET' }
```

## Properties

### path

```ts
path: string;
```

Defined in: [types.ts:26](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L26)

REST API path (may include :id, :slug patterns)

---

### method

```ts
method: HttpMethod;
```

Defined in: [types.ts:28](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L28)

HTTP method
