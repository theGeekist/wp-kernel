[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityDeniedEvent

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
optional context: Record<string, unknown>;
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
