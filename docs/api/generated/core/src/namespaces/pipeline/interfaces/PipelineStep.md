[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineStep

# Interface: PipelineStep\&lt;TKind\&gt;

## Extends

- [`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md)\&lt;`TKind`\&gt;

## Type Parameters

### TKind

`TKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### dependsOn

```ts
readonly dependsOn: readonly string[];
```

#### Inherited from

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`dependsOn`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#dependson)

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

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`key`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#key)

---

### kind

```ts
readonly kind: TKind;
```

#### Inherited from

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`kind`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#kind)

---

### mode

```ts
readonly mode: HelperMode;
```

#### Inherited from

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`mode`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#mode)

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`origin`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#origin)

---

### priority

```ts
readonly priority: number;
```

#### Inherited from

[`HelperDescriptor`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md).[`priority`](../../../../../php-json-ast/src/interfaces/HelperDescriptor.md#priority)
