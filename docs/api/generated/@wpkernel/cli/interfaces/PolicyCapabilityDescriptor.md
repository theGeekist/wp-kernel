[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / PolicyCapabilityDescriptor

# Interface: PolicyCapabilityDescriptor

## Properties

### capability

```ts
capability: string;
```

---

### appliesTo?

```ts
optional appliesTo: PolicyMapScope;
```

---

### binding?

```ts
optional binding: string;
```

Optional request parameter name used when `appliesTo === 'object'`.
Defaults to the resource identity parameter when omitted.
