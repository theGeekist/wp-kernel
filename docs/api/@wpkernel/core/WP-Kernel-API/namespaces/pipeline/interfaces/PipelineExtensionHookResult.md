[**WP Kernel API v0.11.0**](../../../../README.md)

---

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / PipelineExtensionHookResult

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
readonly optional commit: () =&gt; MaybePromise&lt;void&gt;;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)\&lt;`void`\&gt;

---

### rollback()?

```ts
readonly optional rollback: () =&gt; MaybePromise&lt;void&gt;;
```

#### Returns

[`MaybePromise`](../type-aliases/MaybePromise.md)\&lt;`void`\&gt;
