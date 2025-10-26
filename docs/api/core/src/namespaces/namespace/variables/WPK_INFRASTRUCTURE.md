[**WP Kernel API v0.5.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [namespace](../README.md) / WPK_INFRASTRUCTURE

# Variable: WPK_INFRASTRUCTURE

```ts
const WPK_INFRASTRUCTURE: object;
```

Framework infrastructure constants

Keys used for browser APIs (storage, channels), WordPress hooks, and public event names.

## Type Declaration

### POLICY_CACHE_STORAGE

```ts
readonly POLICY_CACHE_STORAGE: "wpk.policy.cache";
```

Storage key prefix for policy cache

### POLICY_CACHE_CHANNEL

```ts
readonly POLICY_CACHE_CHANNEL: "wpk.policy.cache";
```

BroadcastChannel name for policy cache sync

### POLICY_EVENT_CHANNEL

```ts
readonly POLICY_EVENT_CHANNEL: "wpk.policy.events";
```

BroadcastChannel name for policy events

### ACTIONS_CHANNEL

```ts
readonly ACTIONS_CHANNEL: "wpk.actions";
```

BroadcastChannel name for action lifecycle events

### WP_HOOKS_NAMESPACE_PREFIX

```ts
readonly WP_HOOKS_NAMESPACE_PREFIX: "wpk/notices";
```

WordPress hooks namespace prefix for kernel events plugin

### ACTIONS_MESSAGE_TYPE_LIFECYCLE

```ts
readonly ACTIONS_MESSAGE_TYPE_LIFECYCLE: "wpk.action.lifecycle";
```

BroadcastChannel message type for action lifecycle events

### ACTIONS_MESSAGE_TYPE_EVENT

```ts
readonly ACTIONS_MESSAGE_TYPE_EVENT: "wpk.action.event";
```

BroadcastChannel message type for action custom events
