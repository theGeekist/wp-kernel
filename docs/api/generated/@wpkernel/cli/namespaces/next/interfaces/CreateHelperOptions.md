[**WP Kernel API v0.3.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / CreateHelperOptions

# Interface: CreateHelperOptions\&lt;TContext, TInput, TOutput\&gt;

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

## Properties

### key

```ts
readonly key: string;
```

---

### kind

```ts
readonly kind: HelperKind;
```

---

### mode?

```ts
readonly optional mode: HelperMode;
```

---

### priority?

```ts
readonly optional priority: number;
```

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

---

### origin?

```ts
readonly optional origin: string;
```

---

### apply

```ts
readonly apply: HelperApplyFn<TContext, TInput, TOutput>;
```
