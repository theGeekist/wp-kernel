[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / CreatePhpProgramBuilderOptions

# Interface: CreatePhpProgramBuilderOptions\&lt;TContext, TInput, TOutput\&gt;

## Extends

- `Pick`\&lt;[`CreateHelperOptions`](CreateHelperOptions.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;, `"dependsOn"` \| `"mode"` \| `"priority"` \| `"origin"`\&gt;

## Type Parameters

### TContext

`TContext` *extends* [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` *extends* [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` *extends* [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### key

```ts
readonly key: string;
```

***

### filePath

```ts
readonly filePath: string;
```

***

### namespace

```ts
readonly namespace: string;
```

***

### metadata

```ts
readonly metadata: PhpFileMetadata;
```

***

### build()

```ts
readonly build: (builder, entry) =&gt; void | Promise&lt;void&gt;;
```

#### Parameters

##### builder

[`PhpAstBuilderAdapter`](PhpAstBuilderAdapter.md)

##### entry

[`PhpAstContextEntry`](PhpAstContextEntry.md)

#### Returns

`void` \| `Promise`\&lt;`void`\&gt;

***

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`dependsOn`](CreateHelperOptions.md#dependson)

***

### mode?

```ts
readonly optional mode: HelperMode;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`mode`](CreateHelperOptions.md#mode)

***

### priority?

```ts
readonly optional priority: number;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`priority`](CreateHelperOptions.md#priority)

***

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`origin`](CreateHelperOptions.md#origin)
