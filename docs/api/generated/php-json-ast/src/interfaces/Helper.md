[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / Helper

# Interface: Helper\&lt;TContext, TInput, TOutput, TReporter, TKind\&gt;

## Extends

- [`HelperDescriptor`](HelperDescriptor.md)\&lt;`TKind`\&gt;

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

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`key`](HelperDescriptor.md#key)

---

### kind

```ts
readonly kind: TKind;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`kind`](HelperDescriptor.md#kind)

---

### mode

```ts
readonly mode: HelperMode;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`mode`](HelperDescriptor.md#mode)

---

### priority

```ts
readonly priority: number;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`priority`](HelperDescriptor.md#priority)

---

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`dependsOn`](HelperDescriptor.md#dependson)

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`origin`](HelperDescriptor.md#origin)

---

### apply

```ts
readonly apply: HelperApplyFn<TContext, TInput, TOutput, TReporter>;
```
