[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [actions](../README.md) / ActionLifecycleEventBase

# Type Alias: ActionLifecycleEventBase

```ts
type ActionLifecycleEventBase = object;
```

Base metadata shared across all action lifecycle events.

This metadata is attached to every lifecycle event (start/complete/error) and
domain event emitted by actions, enabling:
- Request tracing and correlation
- Cross-tab event de-duplication
- PHP bridge integration
- Observability and debugging

## Properties

### actionName

```ts
actionName: string;
```

***

### requestId

```ts
requestId: string;
```

***

### namespace

```ts
namespace: string;
```

***

### scope

```ts
scope: "crossTab" | "tabLocal";
```

***

### bridged

```ts
bridged: boolean;
```

***

### timestamp

```ts
timestamp: number;
```
