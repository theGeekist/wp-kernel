[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineStep

# Interface: PipelineStep

Represents a single step executed within the pipeline.

## Extends

- [`HelperDescriptor`](HelperDescriptor.md)

## Properties

### id

```ts
readonly id: string;
```

A unique identifier for the step.

---

### index

```ts
readonly index: number;
```

The execution order of the step.

---

### key

```ts
readonly key: string;
```

#### Inherited from

[`HelperDescriptor`](HelperDescriptor.md).[`key`](HelperDescriptor.md#key)

---

### kind

```ts
readonly kind: HelperKind;
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
