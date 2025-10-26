[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ActionErrorEvent

# Type Alias: ActionErrorEvent

```ts
type ActionErrorEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action fails.

Emitted when the action function throws an error, enabling:

- Error notifications and reporting
- Retry logic and fallback behavior
- Error tracking in observability tools

Event name: `wpk.action.error`

## Type Declaration

### phase

```ts
phase: 'error';
```

### error

```ts
error: unknown;
```

### durationMs

```ts
durationMs: number;
```
