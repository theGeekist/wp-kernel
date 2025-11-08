[**@wpkernel/test-utils v0.12.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / ActionRuntimeOverrides

# Interface: ActionRuntimeOverrides

Overrides for the action runtime.

## Properties

### runtime?

```ts
optional runtime: Partial<ActionRuntime>;
```

Partial overrides for the entire runtime object.

---

### capability?

```ts
optional capability: Partial<CapabilityHelpers<Record<string, unknown>>>;
```

Override for the capability object within the runtime.
