[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / CreateHelperOptions

# Interface: CreateHelperOptions\&lt;TContext, TInput, TOutput, TReporter, TKind\&gt;

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ [`Reporter`](../../../core/src/type-aliases/Reporter.md) = [`Reporter`](../../../core/src/type-aliases/Reporter.md)

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
readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
```
