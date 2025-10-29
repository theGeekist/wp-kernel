[**WP Kernel API v0.9.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineExtensionHookResult

# Interface: PipelineExtensionHookResult\&lt;TArtifact\&gt;

## Type Parameters

### TArtifact

`TArtifact`

## Properties

### artifact?

```ts
readonly optional artifact: TArtifact;
```

---

### commit()?

```ts
readonly optional commit: () => MaybePromise<void>;
```

#### Returns

`MaybePromise`\&lt;`void`\&gt;

---

### rollback()?

```ts
readonly optional rollback: () => MaybePromise<void>;
```

#### Returns

`MaybePromise`\&lt;`void`\&gt;
