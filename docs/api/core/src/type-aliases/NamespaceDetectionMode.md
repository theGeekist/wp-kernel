[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / NamespaceDetectionMode

# Type Alias: NamespaceDetectionMode

```ts
type NamespaceDetectionMode = 'wp' | 'auto' | 'heuristic' | 'explicit';
```

Detection mode for namespace resolution

- 'wp': WordPress-native only (wpKernelData, build defines)
- 'auto': WordPress-native + safe heuristics
- 'heuristic': All detection methods including DOM parsing
- 'explicit': Only explicit namespace, no auto-detection
