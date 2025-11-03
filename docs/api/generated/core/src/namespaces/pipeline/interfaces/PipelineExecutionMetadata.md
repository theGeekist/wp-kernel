[**WP Kernel API v0.10.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineExecutionMetadata

# Interface: PipelineExecutionMetadata\&lt;TFragmentKind, TBuilderKind\&gt;

## Extends

- [`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)\&lt;`TFragmentKind`\&gt;

## Type Parameters

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../@wpkernel/cli/type-aliases/HelperKind.md)

## Properties

### builders

```ts
readonly builders: HelperExecutionSnapshot<TBuilderKind>;
```

---

### fragments

```ts
readonly fragments: HelperExecutionSnapshot<TFragmentKind>;
```

#### Inherited from

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md).[`fragments`](FragmentFinalizationMetadata.md#fragments)
