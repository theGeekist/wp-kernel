[**WP Kernel API v0.9.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / CorePipelineContext

# Interface: CorePipelineContext

Context contract shared across core pipeline helpers.

## Properties

### reporter

```ts
reporter: Reporter;
```

Structured reporter instance used for diagnostics.

---

### namespace

```ts
namespace: string;
```

Namespace owning the resource or action under orchestration.

---

### registry?

```ts
readonly optional registry: CorePipelineRegistryBridge;
```

Optional registry bridge helpers surfaced to pipeline extensions.
