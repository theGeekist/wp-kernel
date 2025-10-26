[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / usePolicy

# Function: usePolicy()

```ts
function usePolicy<K>(): UsePolicyResult<K>;
```

React hook that exposes the kernel policy runtime to UI components.

Components can gate controls with `can()` while reacting to the shared
policy cache for loading and error states. The hook mirrors the policy
enforcement path used during action execution, keeping UI affordances in
sync with capability checks. When no policy runtime is present we surface a
developer error so plugin authors remember to bootstrap via `definePolicy()`.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Returns

[`UsePolicyResult`](../../../core/src/namespaces/policy/type-aliases/UsePolicyResult.md)\&lt;`K`\&gt;
