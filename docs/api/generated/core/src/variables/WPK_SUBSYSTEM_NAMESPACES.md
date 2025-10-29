[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPK_SUBSYSTEM_NAMESPACES

# Variable: WPK_SUBSYSTEM_NAMESPACES

```ts
const WPK_SUBSYSTEM_NAMESPACES: object;
```

Framework subsystem namespaces

Granular namespaces for internal framework logging and debugging.
These provide better diagnostic context than the root namespace alone.

## Type Declaration

### POLICY

```ts
readonly POLICY: "wpk.capability";
```

Capability subsystem

### POLICY_CACHE

```ts
readonly POLICY_CACHE: "wpk.capability.cache";
```

Capability cache subsystem

### CACHE

```ts
readonly CACHE: "wpk.cache";
```

Resource cache subsystem

### ACTIONS

```ts
readonly ACTIONS: "wpk.actions";
```

Action subsystem

### EVENTS

```ts
readonly EVENTS: "wpk.events";
```

Event bus subsystem

### NAMESPACE

```ts
readonly NAMESPACE: "wpk.namespace";
```

Namespace detection subsystem

### REPORTER

```ts
readonly REPORTER: "wpk.reporter";
```

Reporter subsystem
