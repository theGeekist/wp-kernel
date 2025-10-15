[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / detectNamespace

# Function: detectNamespace()

```ts
function detectNamespace(options): NamespaceDetectionResult;
```

Detect namespace with intelligent auto-detection

Implements the detection priority cascade:

1. Explicit namespace parameter
2. Build-time defines (**WPK_NAMESPACE**, import.meta.env.WPK_NAMESPACE)
3. Module ID extraction (Script Modules pattern)
4. WordPress plugin header 'Text Domain'
5. package.json 'name' field
6. Fallback to default

## Parameters

### options

[`NamespaceDetectionOptions`](../type-aliases/NamespaceDetectionOptions.md) = `{}`

Detection options

## Returns

[`NamespaceDetectionResult`](../type-aliases/NamespaceDetectionResult.md)

Detection result with namespace and metadata
