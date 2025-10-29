[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / CapabilityMap

# Type Alias: CapabilityMap\&lt;Keys\&gt;

```ts
type CapabilityMap<Keys> = { [K in keyof Keys]: CapabilityRule<Keys[K]> };
```

Mapping from capability key to rule implementation.

## Type Parameters

### Keys

`Keys` _extends_ `Record`\&lt;`string`, `unknown`\&gt;
