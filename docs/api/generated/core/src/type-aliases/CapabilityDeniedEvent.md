[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / CapabilityDeniedEvent

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

### context?

```ts
optional context: Record<string, unknown>;
```

---

### requestId?

```ts
optional requestId: string;
```

---

### timestamp

```ts
timestamp: number;
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
