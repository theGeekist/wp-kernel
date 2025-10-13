[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / ResourceRoute

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

### policy?

```ts
optional policy: string;
```

Optional policy identifier used by tooling to map to capability checks
