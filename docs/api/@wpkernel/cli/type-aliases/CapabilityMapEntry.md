[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / CapabilityMapEntry

# Type Alias: CapabilityMapEntry

```ts
type CapabilityMapEntry =
	| string
	| CapabilityCapabilityDescriptor
	| CapabilityMapFunction;
```

Represents a single entry in the capability map.

Can be a simple string, a descriptor object, or a function returning either.
