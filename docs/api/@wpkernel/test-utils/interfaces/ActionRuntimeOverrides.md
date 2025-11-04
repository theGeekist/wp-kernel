[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ActionRuntimeOverrides

# Interface: ActionRuntimeOverrides

Overrides for the action runtime.

## Properties

### runtime?

```ts
optional runtime: Partial&lt;ActionRuntime&gt;;
```

Partial overrides for the entire runtime object.

---

### capability?

```ts
optional capability: Partial&lt;CapabilityHelpers&lt;Record&lt;string, unknown&gt;&gt;&gt;;
```

Override for the capability object within the runtime.
