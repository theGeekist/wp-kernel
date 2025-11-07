[**@wpkernel/php-json-ast v0.12.0**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / CreatePhpProgramBuilderOptions

# Interface: CreatePhpProgramBuilderOptions\<TContext, TInput, TOutput\>

## Extends

- `Pick`\<[`CreateHelperOptions`](CreateHelperOptions.md)\<`TContext`, `TInput`, `TOutput`\>, `"dependsOn"` \| `"mode"` \| `"priority"` \| `"origin"`\>

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](PipelineContext.md) = [`PipelineContext`](PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](BuilderInput.md) = [`BuilderInput`](BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](BuilderOutput.md) = [`BuilderOutput`](BuilderOutput.md)

## Properties

### key

```ts
readonly key: string;
```

---

### filePath

```ts
readonly filePath: string;
```

---

### namespace

```ts
readonly namespace: string;
```

---

### metadata

```ts
readonly metadata: PhpFileMetadata;
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

`void` \| `Promise`\<`void`\>

---

### dependsOn?

```ts
readonly optional dependsOn: readonly string[];
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`dependsOn`](CreateHelperOptions.md#dependson)

---

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

### origin?

```ts
readonly optional origin: string;
```

#### Inherited from

[`CreateHelperOptions`](CreateHelperOptions.md).[`origin`](CreateHelperOptions.md#origin)
