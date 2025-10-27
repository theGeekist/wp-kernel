[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / PolicyDeniedEvent

# Type Alias: PolicyDeniedEvent

```ts
type PolicyDeniedEvent = object;
```

Payload emitted with `{namespace}.policy.denied` events.

## Properties

### policyKey

```ts
policyKey: string;
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
