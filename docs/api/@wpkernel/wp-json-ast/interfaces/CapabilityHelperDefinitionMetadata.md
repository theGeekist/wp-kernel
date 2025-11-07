[**@wpkernel/wp-json-ast v0.12.0**](../README.md)

---

[@wpkernel/wp-json-ast](../README.md) / CapabilityHelperDefinitionMetadata

# Interface: CapabilityHelperDefinitionMetadata

Metadata for a capability helper definition.

## See

CapabilityHelperMetadata

## Properties

### key

```ts
readonly key: string;
```

The key of the capability.

---

### capability

```ts
readonly capability: string;
```

The name of the capability.

---

### appliesTo

```ts
readonly appliesTo: "object" | "resource";
```

The scope to which the capability applies.

---

### source

```ts
readonly source: "map" | "fallback";
```

The source of the capability definition.

---

### binding?

```ts
readonly optional binding: string;
```

The binding for the capability.
