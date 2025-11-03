[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / HelperDescriptor

# Interface: HelperDescriptor\&lt;TKind\&gt;

## Extended by

- [`Helper`](Helper.md)
- [`PipelineStep`](PipelineStep.md)
- [`PipelineStep`](../../../core/src/namespaces/pipeline/interfaces/PipelineStep.md)

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

---

### key

```ts
readonly key: string;
```

---

### kind

```ts
readonly kind: TKind;
```

---

### mode

```ts
readonly mode: HelperMode;
```

---

### origin?

```ts
readonly optional origin: string;
```

---

### priority

```ts
readonly priority: number;
```
