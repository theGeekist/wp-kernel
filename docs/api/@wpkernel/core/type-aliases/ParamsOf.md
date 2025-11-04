[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ParamsOf

# Type Alias: ParamsOf\&lt;K, Key\&gt;

```ts
type ParamsOf&lt;K, Key&gt; = K[Key] extends void ? [] : [K[Key]];
```

Extract the tuple type used for params in `can`/`assert` helpers.
Ensures that void params are optional while others remain required.

## Type Parameters

### K

`K`

### Key

`Key` _extends_ keyof `K`
