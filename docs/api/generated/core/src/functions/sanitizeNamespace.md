[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / sanitizeNamespace

# Function: sanitizeNamespace()

```ts
function sanitizeNamespace(namespace): string | null;
```

Sanitize namespace string

Converts to lowercase, kebab-case, removes invalid characters,
and checks against reserved words.

## Parameters

### namespace

`string`

Raw namespace string

## Returns

`string` \| `null`

Sanitized namespace or null if invalid
