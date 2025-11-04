[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / CapabilityMapFunction

# Type Alias: CapabilityMapFunction()

```ts
type CapabilityMapFunction = () =&gt;
  | string
  | CapabilityCapabilityDescriptor;
```

A function that returns a capability string or descriptor.

The CLI evaluates function entries at build time, so they must be pure and
free of side effects. Returned descriptors should be JSON-serialisable.

## Returns

\| `string`
\| [`CapabilityCapabilityDescriptor`](../interfaces/CapabilityCapabilityDescriptor.md)
