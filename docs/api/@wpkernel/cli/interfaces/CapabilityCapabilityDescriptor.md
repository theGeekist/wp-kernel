[**@wpkernel/cli v0.12.2-beta.0**](../README.md)

---

[@wpkernel/cli](../README.md) / CapabilityCapabilityDescriptor

# Interface: CapabilityCapabilityDescriptor

Descriptor for a capability entry used during PHP code generation.

Used by the CLI when producing capability-checking helpers. A descriptor
refines how a capability should be evaluated (resource-level or object-level)
and optionally the request parameter to bind when performing object checks.

## Properties

### capability

```ts
capability: string;
```

---

### appliesTo?

```ts
optional appliesTo: CapabilityMapScope;
```

---

### binding?

```ts
optional binding: string;
```

Optional request parameter name used when `appliesTo === 'object'`.
Defaults to the resource identity parameter when omitted.
