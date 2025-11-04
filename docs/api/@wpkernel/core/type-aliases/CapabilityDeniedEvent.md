[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / CapabilityDeniedEvent

# Type Alias: CapabilityDeniedEvent

```ts
type CapabilityDeniedEvent = object;
```

Payload emitted with `{namespace}.capability.denied` events.

## Properties

### capabilityKey

```ts
capabilityKey: string;
```

---

### timestamp

```ts
timestamp: number;
```

---

### context?

```ts
optional context: Record&lt;string, unknown&gt;;
```

---

### requestId?

```ts
optional requestId: string;
```

---

### reason?

```ts
optional reason: string;
```

---

### messageKey?

```ts
optional messageKey: string;
```
