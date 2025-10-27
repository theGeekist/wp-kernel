[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / HelperDescriptor

# Interface: HelperDescriptor\&lt;TKind\&gt;

## Extended by

- [`Helper`](Helper.md)
- [`PipelineStep`](../../../core/src/namespaces/pipeline/interfaces/PipelineStep.md)
- [`PipelineStep`](../../../@wpkernel/cli/namespaces/next/interfaces/PipelineStep.md)

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

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

### priority

```ts
readonly priority: number;
```

---

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

---

### origin?

```ts
readonly optional origin: string;
```
