[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ActionStartEvent

# Type Alias: ActionStartEvent

```ts
type ActionStartEvent = object & ActionLifecycleEventBase;
```

Lifecycle event emitted when an action starts execution.

Emitted immediately before the action function is invoked, enabling:

- Pre-execution hooks for logging or analytics
- Loading states in UI components
- Request correlation across distributed systems

Event name: `wpk.action.start`

## Type Declaration

### phase

```ts
phase: 'start';
```

### args

```ts
args: unknown;
```
