[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineStep

# Interface: PipelineStep\&lt;TKind\&gt;

## Extends

- [`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md)\&lt;`TKind`\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)

## Properties

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`dependsOn`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#dependson)

---

### id

```ts
readonly id: string;
```

---

### index

```ts
readonly index: number;
```

---

### key

```ts
readonly key: string;
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`key`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#key)

---

### kind

```ts
readonly kind: TKind;
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`kind`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#kind)

---

### mode

```ts
readonly mode: HelperMode;
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`mode`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#mode)

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`origin`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#origin)

---

### priority

```ts
readonly priority: number;
```

#### Inherited from

[`HelperDescriptor`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md).[`priority`](../../../../../@wpkernel/cli/interfaces/HelperDescriptor.md#priority)
