[**WP Kernel API v0.5.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ActionCompleteEvent

# Type Alias: ActionCompleteEvent

```ts
type ActionCompleteEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action completes successfully.

Emitted after the action function returns, enabling:

- Success notifications and toasts
- Performance monitoring and metrics
- Post-execution hooks for analytics

Event name: `wpk.action.complete`

## Type Declaration

### phase

```ts
phase: 'complete';
```

### result

```ts
result: unknown;
```

### durationMs

```ts
durationMs: number;
```
