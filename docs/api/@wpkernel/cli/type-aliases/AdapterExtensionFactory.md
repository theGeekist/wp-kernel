[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / AdapterExtensionFactory

# Type Alias: AdapterExtensionFactory()

```ts
type AdapterExtensionFactory = (context) =&gt; 
  | AdapterExtension
  | AdapterExtension[]
  | void;
```

Factory responsible for returning adapter extensions.

## Parameters

### context

[`AdapterContext`](../interfaces/AdapterContext.md)

## Returns

  \| [`AdapterExtension`](../interfaces/AdapterExtension.md)
  \| [`AdapterExtension`](../interfaces/AdapterExtension.md)[]
  \| `void`
