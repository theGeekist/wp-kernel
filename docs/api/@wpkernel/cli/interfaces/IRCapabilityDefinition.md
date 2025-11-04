[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / IRCapabilityDefinition

# Interface: IRCapabilityDefinition

Represents an Intermediate Representation (IR) for a capability definition.

## Properties

### key

```ts
key: string;
```

The key of the capability.

***

### capability

```ts
capability: string;
```

The underlying capability string.

***

### appliesTo

```ts
appliesTo: IRCapabilityScope;
```

The scope to which the capability applies.

***

### source

```ts
source: "map" | "fallback";
```

The source of the capability definition (map or fallback).

***

### binding?

```ts
optional binding: string;
```

Optional: The binding parameter for object-level capabilities.
