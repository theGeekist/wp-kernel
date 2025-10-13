[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [kernel/src](../README.md) / KernelEventMap

# Type Alias: KernelEventMap

```ts
type KernelEventMap = object;
```

## Properties

### resource:defined

```ts
resource: defined: ResourceDefinedEvent;
```

---

### action:defined

```ts
action: defined: ActionDefinedEvent;
```

---

### action:start

```ts
action: start: ActionLifecycleEvent;
```

---

### action:complete

```ts
action: complete: ActionLifecycleEvent;
```

---

### action:error

```ts
action: error: ActionLifecycleEvent;
```

---

### action:domain

```ts
action: domain: ActionDomainEvent;
```

---

### cache:invalidated

```ts
cache: invalidated: CacheInvalidatedEvent;
```

---

### custom:event

```ts
custom: event: CustomKernelEvent;
```
