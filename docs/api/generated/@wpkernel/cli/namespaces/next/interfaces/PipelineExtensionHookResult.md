[**WP Kernel API v0.7.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / PipelineExtensionHookResult

# Interface: PipelineExtensionHookResult

## Properties

### artifact?

```ts
readonly optional artifact: IRv1;
```

---

### commit()?

```ts
readonly optional commit: () => Promise<void>;
```

#### Returns

`Promise`\&lt;`void`\&gt;

---

### rollback()?

```ts
readonly optional rollback: () => Promise<void>;
```

#### Returns

`Promise`\&lt;`void`\&gt;
