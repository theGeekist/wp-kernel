[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / CreatePhpFileBuilderOptions

# Interface: CreatePhpFileBuilderOptions\&lt;TContext, TInput, TOutput\&gt;

## Extends

- `Omit`\&lt;[`CreatePhpProgramBuilderOptions`](CreatePhpProgramBuilderOptions.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;, `"build"`\&gt;

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`mode`](CreateHelperOptions.md#mode)

---

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`priority`](CreateHelperOptions.md#priority)

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`dependsOn`](CreateHelperOptions.md#dependson)

---

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`origin`](CreateHelperOptions.md#origin)

---

### key

```ts
readonly key: string;
```

#### Inherited from

```ts
Omit.key;
```

---

### filePath

```ts
readonly filePath: string;
```

#### Inherited from

```ts
Omit.filePath;
```

---

### namespace

```ts
readonly namespace: string;
```

#### Inherited from

```ts
Omit.namespace;
```

---

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

#### Inherited from

```ts
Omit.metadata;
```

---

### build()

```ts
readonly build: (builder, entry) => void | Promise<void>;
```

#### Parameters

##### builder

[`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

##### entry

[`PhpAstContextEntry`](PhpAstContextEntry.md)

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;
