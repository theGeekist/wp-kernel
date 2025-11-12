[**@wpkernel/cli v0.12.1-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / CapabilityMapScope

# Type Alias: CapabilityMapScope

```ts
type CapabilityMapScope = 'resource' | 'object';
```

Capability map contract used by the CLI when generating PHP permission helpers.

Projects can define inline capability mappings in their resource configurations.
Each key represents a capability identifier referenced by resource routes and
maps to a capability descriptor. Values may either be:

- a WordPress capability string (e.g. `'manage_options'`)
- a descriptor object describing the capability and how it should be applied

All values must be JSON-serializable data (no functions).
