[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceRoute

# Interface: ResourceRoute

Defined in: [resource/types.ts:25](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L25)

Route definition for a single REST operation

## Example

```ts
{ path: '/my-plugin/v1/things/:id', method: 'GET' }
```

## Properties

### path

```ts
path: string;
```

Defined in: [resource/types.ts:27](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L27)

REST API path (may include :id, :slug patterns)

---

### method

```ts
method: HttpMethod;
```

Defined in: [resource/types.ts:29](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L29)

HTTP method
