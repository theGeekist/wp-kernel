[**WP Kernel API v0.6.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / CapabilityCapabilityDescriptor

# Interface: CapabilityCapabilityDescriptor

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
