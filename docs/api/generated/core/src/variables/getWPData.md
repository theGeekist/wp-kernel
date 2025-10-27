[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / getWPData

# Variable: getWPData()

```ts
const getWPData: () => __module | undefined = globalThis.getWPData;
```

Safe accessor that works in browser & SSR contexts
Available globally without imports

## Returns

`__module` \| `undefined`

WordPress data package or undefined if not available
