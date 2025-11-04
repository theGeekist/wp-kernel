[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / CapabilityProxyOptions

# Type Alias: CapabilityProxyOptions

```ts
type CapabilityProxyOptions = object;
```

Options for creating a capability proxy, containing action metadata.

This type defines the metadata associated with an action that is passed to the
capability proxy for context propagation and event correlation.

## Properties

### actionName

```ts
actionName: string;
```

---

### requestId

```ts
requestId: string;
```

---

### namespace

```ts
namespace: string;
```

---

### scope

```ts
scope: 'crossTab' | 'tabLocal';
```

---

### bridged

```ts
bridged: boolean;
```
