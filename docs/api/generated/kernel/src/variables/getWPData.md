[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / getWPData

# Variable: getWPData()

```ts
const getWPData: () => undefined | __module = globalThis.getWPData;
```

Safe accessor that works in browser & SSR contexts
Available globally without imports

## Returns

`undefined` \| `__module`

WordPress data package or undefined if not available
