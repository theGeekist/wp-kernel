[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceRoute

# Type Alias: ResourceRoute

```ts
type ResourceRoute = object;
```

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

REST API path (may include :id, :slug patterns)

---

### method

```ts
method: HttpMethod;
```

HTTP method

---

### capability?

```ts
optional capability: string;
```

Optional capability identifier used by tooling to map to capability checks
