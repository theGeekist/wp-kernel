[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@geekist/wp-kernel-cli](../README.md) / PolicyMapScope

# Type Alias: PolicyMapScope

```ts
type PolicyMapScope = 'resource' | 'object';
```

Policy map contract used by the CLI when generating PHP permission helpers.

Projects can author `src/policy-map.ts` files that export a plain object using
this shape. Each key represents a policy identifier referenced by resource
routes and maps to a capability descriptor. Values may either be:

- a WordPress capability string (e.g. `'manage_options'`),
- a descriptor object describing the capability and how it should be applied,
- or a function that returns either of the above for additional authoring
  flexibility.

The CLI evaluates function entries at build time, so they must be pure and
free of side effects. Returned descriptors should be JSON-serialisable.
