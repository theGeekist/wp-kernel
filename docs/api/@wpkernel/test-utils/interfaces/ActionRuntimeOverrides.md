[**@wpkernel/test-utils v0.11.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ActionRuntimeOverrides

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
