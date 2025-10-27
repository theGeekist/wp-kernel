[**WP Kernel API v0.7.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineExecutionMetadata

# Interface: PipelineExecutionMetadata\&lt;TFragmentKind, TBuilderKind\&gt;

## Extends

- [`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md)\&lt;`TFragmentKind`\&gt;

## Type Parameters

### TFragmentKind

`TFragmentKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

### TBuilderKind

`TBuilderKind` _extends_ [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md) = [`HelperKind`](../../../../../php-json-ast/src/type-aliases/HelperKind.md)

## Properties

### fragments

```ts
readonly fragments: HelperExecutionSnapshot<TFragmentKind>;
```

#### Inherited from

[`FragmentFinalizationMetadata`](FragmentFinalizationMetadata.md).[`fragments`](FragmentFinalizationMetadata.md#fragments)

---

### builders

```ts
readonly builders: HelperExecutionSnapshot<TBuilderKind>;
```
