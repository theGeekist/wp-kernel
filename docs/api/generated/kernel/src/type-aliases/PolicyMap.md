[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / PolicyMap

# Type Alias: PolicyMap\&lt;Keys\&gt;

```ts
type PolicyMap<Keys> = { [K in keyof Keys]: PolicyRule<Keys[K]> };
```

Mapping from policy key to rule implementation.

## Type Parameters

### Keys

`Keys` _extends_ `Record`\&lt;`string`, `unknown`\&gt;
