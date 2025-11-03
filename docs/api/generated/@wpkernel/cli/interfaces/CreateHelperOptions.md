[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / CreateHelperOptions

# Interface: CreateHelperOptions\&lt;TContext, TInput, TOutput, TReporter, TKind\&gt;

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Properties

### apply

```ts
readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
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

### mode?

```ts
readonly optional mode: HelperMode;
```

---

### origin?

```ts
readonly optional origin: string;
```

---

### priority?

```ts
readonly optional priority: number;
```
