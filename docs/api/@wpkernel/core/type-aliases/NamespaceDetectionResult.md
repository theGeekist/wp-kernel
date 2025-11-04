[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / NamespaceDetectionResult

# Type Alias: NamespaceDetectionResult

```ts
type NamespaceDetectionResult = object;
```

Result of namespace detection

## Properties

### namespace

```ts
namespace: string;
```

The detected/resolved namespace

***

### source

```ts
source: 
  | "explicit"
  | "build-define"
  | "env-define"
  | "module-id"
  | "plugin-header"
  | "package-json"
  | "fallback";
```

Source of the namespace

***

### sanitized

```ts
sanitized: boolean;
```

Whether the namespace was sanitized

***

### original?

```ts
optional original: string;
```

Original value before sanitization (if different)
