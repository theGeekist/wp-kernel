[**@wpkernel/cli v0.12.1-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / DxRuntimeFlags

# Interface: DxRuntimeFlags

Runtime flags exposed to DX readiness helpers.

These flags mirror the environment toggles that the CLI exposes while
running inside the monorepo versus the published npm artifact.

## Properties

### forceSource

```ts
readonly forceSource: boolean;
```

Forces helpers to resolve assets from the source tree.
