[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPK_NAMESPACE

# Variable: WPK_NAMESPACE

```ts
const WPK_NAMESPACE: 'wpk' = 'wpk';
```

Root framework namespace

This is the canonical namespace for the WP Kernel framework.
Used as:

- Default reporter namespace when no plugin namespace detected
- Fallback in getNamespace() detection cascade
- Prefix for framework public APIs (events, hooks, storage)
