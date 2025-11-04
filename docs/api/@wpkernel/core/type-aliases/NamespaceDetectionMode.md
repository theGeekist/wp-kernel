[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / NamespaceDetectionMode

# Type Alias: NamespaceDetectionMode

```ts
type NamespaceDetectionMode = "wp" | "auto" | "heuristic" | "explicit";
```

Detection mode for namespace resolution
- 'wp': WordPress-native only (wpKernelData, build defines)
- 'auto': WordPress-native + safe heuristics
- 'heuristic': All detection methods including DOM parsing
- 'explicit': Only explicit namespace, no auto-detection
