[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / IRCapabilityHint

# Interface: IRCapabilityHint

Represents an Intermediate Representation (IR) for a capability hint.

## Properties

### key

```ts
key: string;
```

The key of the capability.

---

### source

```ts
source: 'resource' | 'config';
```

The source of the capability hint (resource or config).

---

### references

```ts
references: object[];
```

References to where this capability is used.

#### resource

```ts
resource: string;
```

#### route

```ts
route: string;
```

#### transport

```ts
transport: IRRouteTransport;
```
